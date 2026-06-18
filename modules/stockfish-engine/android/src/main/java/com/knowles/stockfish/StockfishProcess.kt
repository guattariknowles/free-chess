package com.knowles.stockfish

import android.content.Context
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.Closeable
import java.io.File
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.security.MessageDigest
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

internal class StockfishProcess(
  private val context: Context,
) : Closeable {
  private val outputQueue = LinkedBlockingQueue<String>()
  private val writeLock = Any()

  @Volatile
  private var process: Process? = null
  private var writer: BufferedWriter? = null
  private var readerThread: Thread? = null

  val isRunning: Boolean
    get() = process?.isAlive == true

  fun start() {
    if (isRunning) {
      return
    }

    val networkDirectory = prepareNetworks()
    val engineFile = File(context.applicationInfo.nativeLibraryDir, ENGINE_FILENAME)

    check(engineFile.isFile) {
      "Stockfish executable was not packaged for this device ABI"
    }

    if (!engineFile.canExecute()) {
      engineFile.setExecutable(true, true)
    }
    check(engineFile.canExecute()) {
      "Stockfish executable is not executable on this Android build"
    }

    outputQueue.clear()

    try {
      val startedProcess = ProcessBuilder(engineFile.absolutePath)
        .directory(networkDirectory)
        .redirectErrorStream(true)
        .start()

      process = startedProcess
      writer = BufferedWriter(
        OutputStreamWriter(startedProcess.outputStream, Charsets.UTF_8),
      )
      readerThread = Thread(
        {
          BufferedReader(
            InputStreamReader(startedProcess.inputStream, Charsets.UTF_8),
          ).use { reader ->
            try {
              while (true) {
                val line = reader.readLine() ?: break
                outputQueue.offer(line)
              }
            } finally {
              outputQueue.offer(PROCESS_CLOSED)
            }
          }
        },
        "stockfish-output",
      ).apply {
        isDaemon = true
        start()
      }

      send("uci")
      awaitLine(UCI_START_TIMEOUT_MS) { it == "uciok" }
      send("setoption name Threads value 1")
      send("setoption name Hash value 16")
      send("setoption name Ponder value false")
      send(
        "setoption name EvalFile value " +
          File(networkDirectory, BIG_NETWORK.name).absolutePath,
      )
      send(
        "setoption name EvalFileSmall value " +
          File(networkDirectory, SMALL_NETWORK.name).absolutePath,
      )
      send("isready")
      awaitLine(NETWORK_LOAD_TIMEOUT_MS) { it == "readyok" }
    } catch (error: Throwable) {
      close()
      throw error
    }
  }

  fun search(
    fen: String,
    skillLevel: Int,
    moveTimeMs: Int,
    allowedMoves: List<String>,
  ): String? {
    check(isRunning) { "Stockfish process is not running" }

    send("setoption name Skill Level value $skillLevel")
    send("position fen $fen")

    val searchMoves = if (allowedMoves.isEmpty()) {
      ""
    } else {
      " searchmoves ${allowedMoves.joinToString(" ")}"
    }
    send("go movetime $moveTimeMs$searchMoves")

    val bestMoveLine = awaitLine(
      moveTimeMs.toLong() + SEARCH_GRACE_PERIOD_MS,
    ) { it.startsWith("bestmove ") }
    val bestMove = bestMoveLine
      .removePrefix("bestmove ")
      .substringBefore(' ')

    return bestMove.takeUnless { it == "(none)" || it == "0000" }
  }

  fun stop() {
    if (isRunning) {
      send("stop")
    }
  }

  override fun close() {
    val runningProcess = process
    process = null

    if (runningProcess != null) {
      try {
        synchronized(writeLock) {
          writer?.apply {
            write("quit")
            newLine()
            flush()
          }
        }
      } catch (_: Throwable) {
        // The process may already have closed its input stream.
      }

      try {
        if (!runningProcess.waitFor(PROCESS_EXIT_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
          runningProcess.destroy()
        }
        if (!runningProcess.waitFor(PROCESS_EXIT_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
          runningProcess.destroyForcibly()
        }
      } catch (_: InterruptedException) {
        Thread.currentThread().interrupt()
        runningProcess.destroyForcibly()
      }
    }

    try {
      writer?.close()
    } catch (_: Throwable) {
      // Nothing else can be done during cleanup.
    }
    writer = null
    readerThread?.interrupt()
    readerThread = null
    outputQueue.offer(PROCESS_CLOSED)
  }

  private fun send(command: String) {
    synchronized(writeLock) {
      val activeWriter = writer
        ?: throw IllegalStateException("Stockfish input stream is unavailable")
      activeWriter.write(command)
      activeWriter.newLine()
      activeWriter.flush()
    }
  }

  private fun awaitLine(
    timeoutMs: Long,
    predicate: (String) -> Boolean,
  ): String {
    val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)

    while (true) {
      val remainingNanos = deadline - System.nanoTime()
      if (remainingNanos <= 0) {
        throw TimeoutException("Timed out waiting for Stockfish output")
      }

      val line = outputQueue.poll(
        minOf(
          TimeUnit.NANOSECONDS.toMillis(remainingNanos).coerceAtLeast(1),
          OUTPUT_POLL_INTERVAL_MS,
        ),
        TimeUnit.MILLISECONDS,
      )

      if (line == PROCESS_CLOSED) {
        throw IllegalStateException("Stockfish process exited unexpectedly")
      }
      if (line != null && predicate(line)) {
        return line
      }
      if (process?.isAlive != true) {
        throw IllegalStateException("Stockfish process exited unexpectedly")
      }
    }
  }

  private fun prepareNetworks(): File {
    val directory = File(context.noBackupFilesDir, NETWORK_DIRECTORY)
    check(directory.exists() || directory.mkdirs()) {
      "Unable to create Stockfish network directory"
    }

    copyVerifiedNetwork(directory, BIG_NETWORK)
    copyVerifiedNetwork(directory, SMALL_NETWORK)
    return directory
  }

  private fun copyVerifiedNetwork(directory: File, network: NetworkSpec) {
    val destination = File(directory, network.name)
    if (destination.isFile && sha256(destination) == network.sha256) {
      return
    }

    val temporary = File(directory, "${network.name}.tmp")
    temporary.delete()
    context.assets.open("$ASSET_DIRECTORY/${network.name}").use { input ->
      temporary.outputStream().buffered().use { output ->
        input.copyTo(output)
      }
    }

    check(sha256(temporary) == network.sha256) {
      temporary.delete()
      "Packaged Stockfish network failed SHA-256 verification"
    }

    destination.delete()
    check(temporary.renameTo(destination)) {
      temporary.delete()
      "Unable to install Stockfish network"
    }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().buffered().use { input ->
      val buffer = ByteArray(HASH_BUFFER_SIZE)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) {
          break
        }
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  private data class NetworkSpec(
    val name: String,
    val sha256: String,
  )

  private companion object {
    const val ENGINE_FILENAME = "libstockfish.so"
    const val ASSET_DIRECTORY = "stockfish"
    const val NETWORK_DIRECTORY = "stockfish"
    const val PROCESS_CLOSED = "\u0000stockfish-process-closed\u0000"
    const val HASH_BUFFER_SIZE = 64 * 1024
    const val OUTPUT_POLL_INTERVAL_MS = 250L
    const val UCI_START_TIMEOUT_MS = 10_000L
    const val NETWORK_LOAD_TIMEOUT_MS = 30_000L
    const val SEARCH_GRACE_PERIOD_MS = 5_000L
    const val PROCESS_EXIT_TIMEOUT_MS = 500L

    val BIG_NETWORK = NetworkSpec(
      "nn-c288c895ea92.nnue",
      "c288c895ea924429ea9092e3f36b2b3c1f00f2a3a4c759ff7e57e79e3b43e4a7",
    )
    val SMALL_NETWORK = NetworkSpec(
      "nn-37f18f62d772.nnue",
      "37f18f62d772f3107e1d6aaca3898c130c3c86f2ab63e6555fbbca20635a899d",
    )
  }
}
