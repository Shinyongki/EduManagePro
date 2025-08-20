Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Write-Host 'Checking clipboard...'
    $hasImage = [System.Windows.Forms.Clipboard]::ContainsImage()
    Write-Host "Contains image: $hasImage"
    
    if($hasImage) {
        $img = [System.Windows.Forms.Clipboard]::GetImage()
        if($img) {
            New-Item -ItemType Directory -Force -Path 'C:\temp' | Out-Null
            $img.Save('C:\temp\clipboard_image.png', [System.Drawing.Imaging.ImageFormat]::Png)
            Write-Host 'Image saved to C:\temp\clipboard_image.png'
            $img.Dispose()
        } else {
            Write-Host 'Failed to get image from clipboard'
        }
    } else {
        Write-Host 'No image found in clipboard'
        $formats = [System.Windows.Forms.Clipboard]::GetDataObject().GetFormats()
        Write-Host "Available clipboard formats: $($formats -join ', ')"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}