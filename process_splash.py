from PIL import Image
import numpy as np
import sys

def make_white_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    arr = np.array(img).astype(float)
    
    # Calculate distance to white
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    # white is 255, 255, 255
    dist = np.sqrt((255 - r)**2 + (255 - g)**2 + (255 - b)**2)
    
    # Everything with distance < 20 becomes transparent, 20-60 becomes semi-transparent
    # A simple smoothstep function
    alpha = np.clip((dist - 20) / 40.0, 0, 1)
    
    # Apply alpha
    arr[:,:,3] = (a * alpha)
    arr = arr.astype(np.uint8)
    
    out = Image.fromarray(arr)
    # Crop to bounding box
    bbox = out.getbbox()
    if bbox:
        out = out.crop(bbox)
        
    width, height = out.size
    max_dim = max(width, height)
    padding = int(max_dim * 0.1)
    new_dim = max_dim + padding * 2
    
    square_img = Image.new("RGBA", (new_dim, new_dim), (0, 0, 0, 0))
    offset_x = (new_dim - width) // 2
    offset_y = (new_dim - height) // 2
    square_img.paste(out, (offset_x, offset_y), out)
    
    square_img = square_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return square_img

def main():
    img_path = r"C:\Users\ASUS\.gemini\antigravity-ide\brain\fce336a5-995d-4792-85e4-6bec104d92f4\media__1782396016408.png"
    try:
        print("Processing image with numpy and PIL...")
        img = make_white_transparent(img_path)
        img.save("assets/icon.png", format="PNG")
        img.save("assets/icon-only.png", format="PNG")
        img.save("assets/icon-foreground.png", format="PNG")
        img.save("assets/splash.png", format="PNG")
        img.save("assets/splash-dark.png", format="PNG")
        print("Done")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
