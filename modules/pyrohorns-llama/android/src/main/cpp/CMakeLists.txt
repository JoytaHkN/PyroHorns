cmake_minimum_required(VERSION 3.22.1)
project(pyrohorns_llama C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_C_STANDARD 11)

get_filename_component(PYROHORNS_LLAMA_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../.." ABSOLUTE)
set(LLAMA_DIR "${PYROHORNS_LLAMA_ROOT}/cpp/llama.cpp")

if(NOT EXISTS "${LLAMA_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "Falta llama.cpp en ${LLAMA_DIR}. Ejecuta sh scripts/vendor-llama.sh")
endif()

add_subdirectory("${LLAMA_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/llama.cpp")

add_library(pyrohorns_llama SHARED llama-jni.cpp)

target_include_directories(pyrohorns_llama PRIVATE
  "${LLAMA_DIR}/include"
  "${LLAMA_DIR}/ggml/include"
)

target_link_libraries(pyrohorns_llama llama ggml android log)

# --- Voz (P25): whisper.cpp (MIT) ---------------------------------------------------------------------------------------
# Se compila en un proyecto CMake aparte (ExternalProject) con su propio ggml, en bibliotecas estáticas y con los símbolos
# ocultos. Así no choca con el ggml de llama.cpp, que va en bibliotecas compartidas propias. La biblioteca resultante
# (libpyrohorns_whisper.so) exporta solo las funciones JNI.
set(WHISPER_DIR "${PYROHORNS_LLAMA_ROOT}/cpp/whisper.cpp")
if(NOT EXISTS "${WHISPER_DIR}/CMakeLists.txt")
  message(FATAL_ERROR "Falta whisper.cpp en ${WHISPER_DIR}. Ejecuta sh scripts/vendor-whisper.sh")
endif()
set(WHISPER_BIN "${CMAKE_CURRENT_BINARY_DIR}/whisper-build")
set(WHISPER_LIBS
  "${WHISPER_BIN}/lib/libwhisper.a"
  "${WHISPER_BIN}/lib/libggml.a"
  "${WHISPER_BIN}/lib/libggml-cpu.a"
  "${WHISPER_BIN}/lib/libggml-base.a")

include(ExternalProject)
ExternalProject_Add(whisper_ext
  SOURCE_DIR "${WHISPER_DIR}"
  BINARY_DIR "${WHISPER_BIN}"
  INSTALL_COMMAND ""
  CMAKE_ARGS
    -DCMAKE_TOOLCHAIN_FILE=${CMAKE_TOOLCHAIN_FILE}
    -DANDROID_ABI=${ANDROID_ABI}
    -DANDROID_PLATFORM=${ANDROID_PLATFORM}
    -DANDROID_STL=c++_shared
    -DCMAKE_BUILD_TYPE=Release
    -DBUILD_SHARED_LIBS=OFF
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON
    -DCMAKE_C_VISIBILITY_PRESET=hidden
    -DCMAKE_CXX_VISIBILITY_PRESET=hidden
    -DCMAKE_VISIBILITY_INLINES_HIDDEN=ON
    -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY=${WHISPER_BIN}/lib
    -DWHISPER_BUILD_EXAMPLES=OFF
    -DWHISPER_BUILD_TESTS=OFF
    -DWHISPER_BUILD_SERVER=OFF
    -DGGML_NATIVE=OFF
    -DGGML_OPENMP=OFF
    -DGGML_BACKEND_DL=OFF
    -DGGML_CPU_ALL_VARIANTS=OFF
  BUILD_BYPRODUCTS ${WHISPER_LIBS}
)

add_library(pyrohorns_whisper SHARED whisper-jni.cpp)
add_dependencies(pyrohorns_whisper whisper_ext)
target_include_directories(pyrohorns_whisper PRIVATE
  "${WHISPER_DIR}/include"
  "${WHISPER_DIR}/ggml/include"
)
target_link_libraries(pyrohorns_whisper PRIVATE
  -Wl,--start-group ${WHISPER_LIBS} -Wl,--end-group
  android log
)
