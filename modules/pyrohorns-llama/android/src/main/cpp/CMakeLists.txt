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

target_link_libraries(pyrohorns_llama llama android log)
