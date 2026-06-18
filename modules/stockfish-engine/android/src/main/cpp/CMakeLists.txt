cmake_minimum_required(VERSION 3.22.1)

project(stockfish_engine LANGUAGES CXX)

set(STOCKFISH_DIR
    "${CMAKE_CURRENT_SOURCE_DIR}/../../../../vendor/Stockfish-sf_18/src")

set(STOCKFISH_SOURCES
    "${STOCKFISH_DIR}/benchmark.cpp"
    "${STOCKFISH_DIR}/bitboard.cpp"
    "${STOCKFISH_DIR}/engine.cpp"
    "${STOCKFISH_DIR}/evaluate.cpp"
    "${STOCKFISH_DIR}/main.cpp"
    "${STOCKFISH_DIR}/memory.cpp"
    "${STOCKFISH_DIR}/misc.cpp"
    "${STOCKFISH_DIR}/movegen.cpp"
    "${STOCKFISH_DIR}/movepick.cpp"
    "${STOCKFISH_DIR}/position.cpp"
    "${STOCKFISH_DIR}/score.cpp"
    "${STOCKFISH_DIR}/search.cpp"
    "${STOCKFISH_DIR}/thread.cpp"
    "${STOCKFISH_DIR}/timeman.cpp"
    "${STOCKFISH_DIR}/tt.cpp"
    "${STOCKFISH_DIR}/tune.cpp"
    "${STOCKFISH_DIR}/uci.cpp"
    "${STOCKFISH_DIR}/ucioption.cpp"
    "${STOCKFISH_DIR}/syzygy/tbprobe.cpp"
    "${STOCKFISH_DIR}/nnue/nnue_accumulator.cpp"
    "${STOCKFISH_DIR}/nnue/nnue_misc.cpp"
    "${STOCKFISH_DIR}/nnue/network.cpp"
    "${STOCKFISH_DIR}/nnue/features/full_threats.cpp"
    "${STOCKFISH_DIR}/nnue/features/half_ka_v2_hm.cpp")

add_executable(stockfish ${STOCKFISH_SOURCES})

target_compile_features(stockfish PRIVATE cxx_std_17)
target_compile_definitions(
  stockfish
  PRIVATE
    IS_64BIT
    NDEBUG
    NNUE_EMBEDDING_OFF
    USE_POPCNT
    USE_PREFETCH)
target_compile_options(
  stockfish
  PRIVATE
    -O3
    -fPIE
    -fno-exceptions
    -Wall
    -Wcast-qual)
target_include_directories(stockfish PRIVATE "${STOCKFISH_DIR}")
target_link_options(stockfish PRIVATE -fPIE -pie)
target_link_libraries(stockfish PRIVATE atomic)

if(ANDROID_ABI STREQUAL "arm64-v8a")
  target_compile_definitions(stockfish PRIVATE ARCH=armv8 USE_NEON=8)
elseif(ANDROID_ABI STREQUAL "x86_64")
  target_compile_definitions(stockfish PRIVATE ARCH=x86-64 USE_SSE2)
  target_compile_options(stockfish PRIVATE -msse2)
else()
  message(FATAL_ERROR "Unsupported Stockfish ABI: ${ANDROID_ABI}")
endif()

set_target_properties(
  stockfish
  PROPERTIES
    OUTPUT_NAME "libstockfish"
    SUFFIX ".so")
