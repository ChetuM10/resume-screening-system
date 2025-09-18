document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadButton = document.querySelector('button[type="submit"]');
    
    if (!uploadForm) {
        console.log('❌ Upload form not found');
        return;
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const files = uploadForm.resumeFiles?.files || uploadForm.resumes?.files;
        if (!files || files.length === 0) {
            uploadStatus.textContent = 'Please select at least one file.';
            uploadStatus.className = 'alert alert-warning';
            return;
        }

        console.log(`📁 Starting upload of ${files.length} files`);

        // Build form data
        const formData = new FormData();
        for (const file of files) {
            formData.append('resumes', file);
        }

        // Update UI
        const originalButtonText = uploadButton.textContent;
        uploadButton.textContent = 'Uploading...';
        uploadButton.disabled = true;
        uploadStatus.textContent = 'Uploading files...';
        uploadStatus.className = 'alert alert-info';

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest' // Mark as AJAX request
                }
            });

            console.log(`📡 Response status: ${response.status}`);

            if (!response.ok) {
                // Try to get error details
                let errorMessage = 'Upload failed';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    console.error('❌ Upload error:', errorData);
                } catch (parseError) {
                    console.error('❌ Could not parse error response:', parseError);
                }
                throw new Error(errorMessage);
            }

            // Parse success response
            const data = await response.json();
            console.log('✅ Upload successful:', data);

            if (data.success) {
                uploadStatus.innerHTML = `
                    <strong>Success!</strong> ${data.message}
                    <br>
                    <small>
                        Processed: ${data.summary.successful} files
                        ${data.summary.failed > 0 ? `| Failed: ${data.summary.failed} files` : ''}
                        | Time: ${Math.round(data.summary.processingTimeMs / 1000)}s
                    </small>
                `;
                uploadStatus.className = 'alert alert-success';
                
                // Show processed candidates
                if (data.results && data.results.length > 0) {
                    const candidatesList = data.results.map(result => 
                        `• ${result.candidateName} (${result.skills.length} skills)`
                    ).join('<br>');
                    
                    uploadStatus.innerHTML += `
                        <br><br>
                        <strong>Processed Candidates:</strong><br>
                        ${candidatesList}
                    `;
                }

                // Reset form after successful upload
                uploadForm.reset();
                
                // Redirect to dashboard after 3 seconds
                setTimeout(() => {
                    window.location.href = '/dashboard/resumes/processed';
                }, 3000);
            } else {
                throw new Error(data.error || 'Upload failed');
            }

        } catch (error) {
            console.error('💥 Upload error:', error);
            uploadStatus.innerHTML = `
                <strong>Error:</strong> ${error.message}
                <br>
                <small>Please try again or contact support if the problem persists.</small>
            `;
            uploadStatus.className = 'alert alert-danger';
        } finally {
            // Restore button state
            uploadButton.textContent = originalButtonText;
            uploadButton.disabled = false;
        }
    });

    // ✅ Add drag and drop support
    const dropZone = document.querySelector('.drag-drop-area');
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        function highlight(e) {
            dropZone.classList.add('highlight');
        }

        function unhighlight(e) {
            dropZone.classList.remove('highlight');
        }

        dropZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (uploadForm.resumeFiles) {
                uploadForm.resumeFiles.files = files;
            } else if (uploadForm.resumes) {
                uploadForm.resumes.files = files;
            }
            
            // Update file display
            updateFileDisplay(files);
        }
    }

    // ✅ Add file selection display
    function updateFileDisplay(files) {
        const fileDisplay = document.getElementById('selectedFiles') || createFileDisplay();
        fileDisplay.innerHTML = '';
        
        for (let file of files) {
            const fileItem = document.createElement('div');
            fileItem.className = 'selected-file-item';
            fileItem.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <span>${file.name}</span>
                <small>(${(file.size / 1024 / 1024).toFixed(2)} MB)</small>
            `;
            fileDisplay.appendChild(fileItem);
        }
    }

    function createFileDisplay() {
        const fileDisplay = document.createElement('div');
        fileDisplay.id = 'selectedFiles';
        fileDisplay.className = 'selected-files-display';
        uploadForm.appendChild(fileDisplay);
        return fileDisplay;
    }

    // ✅ Handle file input change
    const fileInput = uploadForm.resumeFiles || uploadForm.resumes;
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updateFileDisplay(e.target.files);
        });
    }
});
