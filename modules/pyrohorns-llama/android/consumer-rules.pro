# El JNI (llama-jni.cpp) llama por nombre a LlamaEventSink.emit: R8 no puede renombrarlo ni quitarlo.
-keep interface expo.modules.pyrohornsllama.LlamaEventSink { *; }
-keep class * implements expo.modules.pyrohornsllama.LlamaEventSink { *; }
-keep class expo.modules.pyrohornsllama.PyroHornsLlamaNative { *; }
