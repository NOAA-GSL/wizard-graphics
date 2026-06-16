for img in *.png; do
    # Get the current width of the image
    width=$(sips -g pixelWidth "$img" | awk '/pixelWidth/ {print $2}')
    
    # Check if the width is greater than 300
    if [ "$width" -gt 300 ]; then
        echo "Resizing $img (Current width: $width)"
        sips --resampleWidth 300 "$img"
    else
        echo "Skipping $img (Current width: $width)"
    fi
done