import time
import keyboard
import pyperclip
import sys
import re

# Configuration
HOTKEY = 'f9'

def clean_filename(text):
    """
    Cleans the filename similar to the web app:
    - Removes extension
    - Replaces underscores/dots with spaces
    """
    # 1. Remove extension if it looks like one (last dot segment)
    if '.' in text:
        text = text.rsplit('.', 1)[0]
    
    # 2. Replace separators with spaces
    text = re.sub(r'[_\.-]+', ' ', text)
    
    # 3. Collapse spaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def copy_filename_only():
    print(f"[*] Hotkey {HOTKEY} pressed. Copying filename...")
    
    try:
        # Reset Explorer
        keyboard.send('esc')
        time.sleep(0.1)
        
        # Clear clipboard
        pyperclip.copy("")
        
        # F2 -> Ctrl+C -> Esc sequence
        keyboard.send('f2')
        time.sleep(0.2)
        keyboard.send('ctrl+c')
        time.sleep(0.2)
        keyboard.send('esc')
        time.sleep(0.1)
        
        # Get content
        raw_text = pyperclip.paste()
        
        if not raw_text:
            # Fallback
            print("[!] F2 empty. Trying Ctrl+C...")
            keyboard.send('ctrl+c')
            time.sleep(0.3)
            raw_text = pyperclip.paste()
            
        if raw_text:
            clean_text = clean_filename(raw_text)
            pyperclip.copy(clean_text)
            print(f"[*] SUCCESS: Copied '{clean_text}' to clipboard!")
        else:
            print("[!] Failed to copy. Select a file first.")
            print('\a') # Beep
            
    except Exception as e:
        print(f"[!] Error: {e}")

def paste_content_only():
    try:
        print(f"[*] Hotkey F10 pressed. Pasting...")
        # Small delay to ensure clean state and avoid modifier conflict
        time.sleep(0.2)
        keyboard.send('ctrl+v')
        print(f"[*] Paste command sent.")
    except Exception as e:
        print(f"[!] Paste Error: {e}")

def main():
    print("="*40)
    print(f" Simple Copy/Paste Script")
    print(f" 1. Select a file -> Press {HOTKEY} to COPY clean name")
    print(f" 2. Place cursor  -> Press F10 to PASTE")
    print("="*40)
    
    keyboard.add_hotkey(HOTKEY, copy_filename_only, suppress=True)
    keyboard.add_hotkey('f10', paste_content_only, suppress=True)
    keyboard.wait()

if __name__ == "__main__":
    main()
