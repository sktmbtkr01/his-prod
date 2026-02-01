
import sys
import importlib.util

print("Python Executable:", sys.executable)
print("Python Version:", sys.version)

def check_import(module_name):
    found = importlib.util.find_spec(module_name) is not None
    print(f"[{'OK' if found else 'MISSING'}] {module_name}")
    return found

print("\n--- Checking Dependencies ---")
pkg_ok = check_import("sentencepiece")
proto_ok = check_import("google.protobuf")
torch_ok = check_import("torch")
transformers_ok = check_import("transformers")

if pkg_ok and transformers_ok:

print("\n--- Checking Tesseract OCR ---")
import os
from pathlib import Path

tesseract_paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    # Add potential user path if needed
]

found_tesseract = False
for path in tesseract_paths:
    if os.path.exists(path):
        print(f"[OK] Tesseract found at: {path}")
        found_tesseract = True
        break

if not found_tesseract:
    # Check PATH
    import shutil
    if shutil.which("tesseract"):
        print("[OK] Tesseract found in system PATH")
        found_tesseract = True
    else:
        print("[MISSING] Tesseract executable not found!")
        print("Please install Tesseract-OCR from: https://github.com/UB-Mannheim/tesseract/wiki")

print("\n--- Testing Tokenizer Loading ---")
if pkg_ok and transformers_ok:
    try:
        from transformers import DonutProcessor
        print("Success: Transformers imported.")
        # Try a simple text tokenization test if possible, or just pass
        print("Dependency check passed.")
    except Exception as e:
        print(f"Error importing transformers components: {e}")
else:
    print("\nXXX Critical dependencies missing. Please run: pip install -r requirements.txt XXX")
