package com.knowles.stockfish

import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

class StockfishEngineModule : Module() {
  private val engineLock = Any()
  private val searchExecutor = Executors.newSingleThreadExecutor { task ->
    Thread(task, "stockfish-search").apply {
      isDaemon = true
    }
  }

  @Volatile
  private var engine: StockfishProcess? = null

  override fun definition() = ModuleDefinition {
    Name("StockfishEngine")

    AsyncFunction("isAvailable") { promise: Promise ->
      submit(promise) {
        try {
          requireEngine()
          promise.resolve(true)
        } catch (_: Throwable) {
          closeEngine()
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("getBestMove") {
        fen: String,
        skillLevel: Int,
        moveTimeMs: Int,
        allowedMoves: List<String>,
        promise: Promise ->
      submit(promise) {
        try {
          validateRequest(fen, allowedMoves)
          val result = searchWithSingleRestart(
            fen = fen,
            skillLevel = skillLevel.coerceIn(0, 20),
            moveTimeMs = moveTimeMs.coerceIn(50, 5_000),
            allowedMoves = allowedMoves,
          )
          promise.resolve(result)
        } catch (error: Throwable) {
          promise.reject(
            "ERR_STOCKFISH_SEARCH",
            error.message ?: "Stockfish search failed",
            error,
          )
        }
      }
    }

    AsyncFunction("analyze") {
        fen: String,
        skillLevel: Int,
        moveTimeMs: Int,
        allowedMoves: List<String>,
        promise: Promise ->
      submit(promise) {
        try {
          validateRequest(fen, allowedMoves)
          val result = analyzeWithSingleRestart(
            fen = fen,
            skillLevel = skillLevel.coerceIn(0, 20),
            moveTimeMs = moveTimeMs.coerceIn(50, 5_000),
            allowedMoves = allowedMoves,
          )
          promise.resolve(result.toMap())
        } catch (error: Throwable) {
          promise.reject(
            "ERR_STOCKFISH_ANALYSIS",
            error.message ?: "Stockfish analysis failed",
            error,
          )
        }
      }
    }

    AsyncFunction("stop") {
      stopActiveSearch()
    }

    OnActivityEntersBackground {
      stopActiveSearch()
    }

    OnDestroy {
      stopActiveSearch()
      closeEngine()
      searchExecutor.shutdownNow()
    }
  }

  private fun submit(promise: Promise, task: () -> Unit) {
    try {
      searchExecutor.execute(task)
    } catch (error: RejectedExecutionException) {
      promise.reject(
        "ERR_STOCKFISH_DESTROYED",
        "Stockfish module is no longer available",
        error,
      )
    }
  }

  private fun requireEngine(): StockfishProcess {
    synchronized(engineLock) {
      val current = engine
      if (current?.isRunning == true) {
        return current
      }

      current?.close()
      return StockfishProcess(applicationContext).also {
        it.start()
        engine = it
      }
    }
  }

  private fun searchWithSingleRestart(
    fen: String,
    skillLevel: Int,
    moveTimeMs: Int,
    allowedMoves: List<String>,
  ): String? {
    var firstError: Throwable? = null

    repeat(2) { attempt ->
      try {
        return requireEngine().search(
          fen = fen,
          skillLevel = skillLevel,
          moveTimeMs = moveTimeMs,
          allowedMoves = allowedMoves,
        )
      } catch (error: Throwable) {
        closeEngine()
        if (attempt == 1) {
          firstError?.let(error::addSuppressed)
          throw error
        }
        firstError = error
      }
    }

    error("Stockfish search failed")
  }

  private fun analyzeWithSingleRestart(
    fen: String,
    skillLevel: Int,
    moveTimeMs: Int,
    allowedMoves: List<String>,
  ): StockfishProcess.SearchResult {
    var firstError: Throwable? = null

    repeat(2) { attempt ->
      try {
        return requireEngine().analyze(
          fen = fen,
          skillLevel = skillLevel,
          moveTimeMs = moveTimeMs,
          allowedMoves = allowedMoves,
        )
      } catch (error: Throwable) {
        closeEngine()
        if (attempt == 1) {
          firstError?.let(error::addSuppressed)
          throw error
        }
        firstError = error
      }
    }

    error("Stockfish analysis failed")
  }

  private fun stopActiveSearch() {
    synchronized(engineLock) {
      engine?.stop()
    }
  }

  private fun closeEngine() {
    val current = synchronized(engineLock) {
      engine.also { engine = null }
    }
    current?.close()
  }

  private fun validateRequest(fen: String, allowedMoves: List<String>) {
    require(fen.isNotBlank()) { "FEN must not be empty" }
    require(allowedMoves.all(UCI_MOVE_PATTERN::matches)) {
      "Allowed moves must use UCI coordinate notation"
    }
  }

  private val applicationContext
    get() = appContext.reactContext?.applicationContext
      ?: throw Exceptions.ReactContextLost()

  private companion object {
    val UCI_MOVE_PATTERN = Regex("^[a-h][1-8][a-h][1-8][qrbn]?$")
  }
}
