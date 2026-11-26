#!/usr/bin/env python3
"""Comprueba que el APK lleva lo que la app necesita (P31-M5). Uso: python3 -I scripts/check-apk.py app.apk [--sha SHA]

La CI llegó a pasar en verde sin el módulo nativo, y R8 rompió una llamada JNI: ambos casos se detectan aquí.
Si se añade o quita una biblioteca, un permiso o una clase JNI, actualizar estas listas.
"""
import json
import re
import struct
import sys
import zipfile

LIBS = ['libpyrohorns_llama.so', 'libpyrohorns_whisper.so', 'libllama.so', 'libggml.so', 'libggml-base.so', 'libexpo-sqlite.so', 'libcrypto.so']
MIN_CPU_VARIANTS = 5
PERMISSIONS = [
    'android.permission.' + p
    for p in 'INTERNET MANAGE_EXTERNAL_STORAGE READ_CALENDAR WRITE_CALENDAR READ_CONTACTS RECORD_AUDIO '
    'READ_EXTERNAL_STORAGE WRITE_EXTERNAL_STORAGE SYSTEM_ALERT_WINDOW USE_BIOMETRIC USE_FINGERPRINT VIBRATE'.split()
] + ['com.android.alarm.permission.SET_ALARM']
PKG = 'Lexpo/modules/pyrohornsllama/'
# Clases que el código nativo busca por nombre, con los métodos que deben conservarlo.
JNI = {'LlamaEventSink': ['emit'], 'PyroHornsLlamaNative': ['loadModel'], 'PyroHornsWhisperNative': []}


def dex_methods(data):
    """{descriptor de clase: nombres de método} según la tabla method_ids de un dex."""
    u32 = lambda off: struct.unpack_from('<I', data, off)[0]
    string_off, type_off = u32(0x3C), u32(0x44)
    method_size, method_off = u32(0x58), u32(0x5C)

    def string(i):
        p = u32(string_off + 4 * i)
        while data[p] & 0x80:  # longitud en uleb128
            p += 1
        p += 1
        return data[p:data.index(0, p)].decode('utf-8', 'replace')

    out = {}
    for i in range(method_size):
        cls, _, name = struct.unpack_from('<HHI', data, method_off + 8 * i)
        out.setdefault(string(u32(type_off + 4 * cls)), set()).add(string(name))
    return out


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    sha = args[args.index('--sha') + 1] if '--sha' in args else None
    problems = []
    with zipfile.ZipFile(args[0]) as z:
        names = set(z.namelist())
        libs = {n.rsplit('/', 1)[1] for n in names if n.startswith('lib/arm64-v8a/')}
        problems += [f'falta la biblioteca {lib}' for lib in LIBS if lib not in libs]
        variants = [lib for lib in libs if lib.startswith('libggml-cpu-')]
        if len(variants) < MIN_CPU_VARIANTS:
            problems.append(f'solo hay {len(variants)} variantes de ggml-cpu (mínimo {MIN_CPU_VARIANTS})')

        methods = {}
        for n in names:
            if re.fullmatch(r'classes\d*\.dex', n):
                for cls, found in dex_methods(z.read(n)).items():
                    methods.setdefault(cls, set()).update(found)
        for cls, wanted in JNI.items():
            found = methods.get(f'{PKG}{cls};')
            if found is None:
                problems.append(f'R8 quitó o renombró la clase {cls}')
                continue
            problems += [f'R8 quitó o renombró {cls}.{m}' for m in wanted if m not in found]

        # Las cadenas del manifiesto binario van en UTF-16 (a veces desalineadas) o en UTF-8.
        raw = z.read('AndroidManifest.xml')
        manifest = ' '.join([raw.decode('utf-16-le', 'ignore'), raw[1:].decode('utf-16-le', 'ignore'), raw.decode('utf-8', 'ignore')])
        declared = set(re.findall(r'(?:android|com\.android\.alarm)\.permission\.[A-Z_]+', manifest))
        problems += [f'falta el permiso {p}' for p in PERMISSIONS if p not in declared]  # D9: se mantienen todos

        if sha:
            config = json.loads(z.read('assets/app.config')) if 'assets/app.config' in names else {}
            got = config.get('extra', {}).get('build', {}).get('sha')
            if got != sha:
                problems.append(f'assets/app.config no lleva el commit {sha} (lleva {got})')

    for p in problems:
        print(f'✗ {p}')
    if problems:
        sys.exit(1)
    print(f'✓ APK correcto: {len(libs)} bibliotecas, {len(variants)} variantes de CPU, clases JNI y permisos presentes')


main()
