import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import JSZip from 'jszip';

export async function GET(request: NextRequest) {
  try {
    const zip = new JSZip();
    const extensionPath = join(process.cwd(), 'extension');
    
    // Add all extension files to zip
    function addDirectoryToZip(dirPath: string, zipFolder: JSZip) {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Recursively add subdirectories
          const subFolder = zipFolder.folder(item);
          if (subFolder) {
            addDirectoryToZip(itemPath, subFolder);
          }
        } else {
          // Add file to zip
          const fileContent = readFileSync(itemPath);
          zipFolder.file(item, fileContent);
        }
      }
    }
    
    // Add all extension files
    addDirectoryToZip(extensionPath, zip);
    
    // Add installation instructions
    const installInstructions = `# CryptLock Browser Extension Installation Guide

## Quick Setup

### For Chrome/Edge:
1. Extract this zip file to a folder
2. Go to chrome://extensions/
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the extracted extension folder
6. Pin the extension to your toolbar

### For Firefox:
1. Extract this zip file to a folder
2. Go to about:debugging
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select manifest.json from the extracted folder
6. Note: Extension will reset when Firefox closes

## Requirements
- CryptLock web app running on http://localhost:3000
- Browser with developer mode enabled

## How to Use
1. Visit any website with login forms
2. Start typing in a password field
3. Click the "Save to CryptLock" button that appears
4. Your password will be saved securely to your vault

## Troubleshooting
- Button not appearing? Refresh the page after installation
- Extension not working? Make sure CryptLock is running
- Service worker issues? Reload the extension in browser settings

## Security
- Extension never stores passwords locally
- All data goes directly to your encrypted CryptLock vault
- Zero-knowledge architecture maintained

Built with ❤️ for your privacy and security.
`;
    
    zip.file('INSTALLATION.md', installInstructions);
    
    // Generate zip
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // Return zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="cryptlock-extension.zip"',
        'Content-Length': zipBuffer.length.toString()
      }
    });
    
  } catch (error) {
    console.error('Error creating extension zip:', error);
    return NextResponse.json(
      { error: 'Failed to create extension package' },
      { status: 500 }
    );
  }
} 