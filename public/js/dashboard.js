// public/js/dashboard.js - COMPLETE FIXED VERSION

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard JavaScript loaded');

    // ✅ FIX: Enhanced delete handler for screening cards
    document.querySelectorAll('.delete-btn-card').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.preventDefault();
            
            const id = btn.dataset.screeningId;
            const job = btn.dataset.jobTitle || 'Unknown Job';
            
            if (!confirm(`Delete "${job}" screening?\n\nThis action cannot be undone.`)) {
                return;
            }
            
            // Store original state for restoration
            const originalHTML = btn.innerHTML;
            const originalDisabled = btn.disabled;
            
            // Show loading state
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            try {
                console.log(`🗑️ Attempting to delete screening: ${id}`);
                
                // ✅ FIX: Proper endpoint and headers
                const response = await fetch(`/screening/${id}`, { 
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📡 Response status: ${response.status}`);
                
                // ✅ FIX: Check content type before parsing
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned HTML instead of JSON. Please check server logs.');
                }
                
                const data = await response.json();
                console.log('📊 Response data:', data);
                
                if (!response.ok || !data.success) {
                    throw new Error(data.error || data.message || `HTTP ${response.status}`);
                }
                
                // ✅ FIX: Enhanced DOM removal with smooth animation
                const card = btn.closest('.col-lg-6, .col-xl-4, .screening-card, .card');
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        card.remove();
                        
                        // Show success notification
                        showNotification(`Successfully deleted "${job}" screening`, 'success');
                        
                        // Update page counters if they exist
                        updatePageCounters();
                        
                    }, 300);
                } else {
                    // Fallback: reload page
                    console.log('⚠️ Card element not found, reloading page');
                    window.location.reload();
                }
                
            } catch (error) {
                console.error('❌ Delete operation failed:', error);
                
                // ✅ FIX: Better error messages
                let errorMessage = error.message;
                if (errorMessage.includes('JSON')) {
                    errorMessage = 'Server error - please refresh the page and try again';
                } else if (errorMessage.includes('404')) {
                    errorMessage = 'Screening already deleted or not found';
                } else if (errorMessage.includes('500')) {
                    errorMessage = 'Server error - please try again later';
                }
                
                showNotification(`Delete failed: ${errorMessage}`, 'error');
                
                // Restore button state
                btn.innerHTML = originalHTML;
                btn.disabled = originalDisabled;
            }
        });
    });

    // ✅ NEW: Delete handler for candidate cards
    document.querySelectorAll('.delete-candidate-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            e.preventDefault();
            
            const candidateId = btn.dataset.candidateId;
            const candidateName = btn.dataset.candidateName || 'Unknown Candidate';
            
            if (!confirm(`Permanently delete candidate "${candidateName}"?\n\nThis will remove them from all screenings and cannot be undone.`)) {
                return;
            }
            
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            try {
                const response = await fetch(`/dashboard/candidate/${candidateId}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Server returned HTML instead of JSON');
                }
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }
                
                // Remove candidate card with animation
                const candidateCard = btn.closest('.candidate-card, .resume-card, .card');
                if (candidateCard) {
                    candidateCard.style.transition = 'all 0.3s ease';
                    candidateCard.style.opacity = '0';
                    candidateCard.style.transform = 'scale(0.8)';
                    setTimeout(() => {
                        candidateCard.remove();
                        showNotification(`Successfully deleted candidate "${candidateName}"`, 'success');
                        updatePageCounters();
                    }, 300);
                }
                
            } catch (error) {
                console.error('❌ Candidate delete failed:', error);
                showNotification(`Delete failed: ${error.message}`, 'error');
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    });

    // ✅ NEW: Utility functions
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(toast => toast.remove());
        
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show notification-toast`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        notification.innerHTML = `
            <i class="fas ${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    function updatePageCounters() {
        // Update any counters on the page
        const counters = document.querySelectorAll('.total-count, .screening-count, .candidate-count');
        counters.forEach(counter => {
            const currentCount = parseInt(counter.textContent) || 0;
            if (currentCount > 0) {
                counter.textContent = currentCount - 1;
            }
        });
    }

    // ✅ NEW: Handle general delete buttons (fallback)
    document.querySelectorAll('.btn-delete, .delete-btn').forEach(btn => {
        if (!btn.classList.contains('delete-btn-card') && !btn.classList.contains('delete-candidate-btn')) {
            btn.addEventListener('click', async e => {
                e.preventDefault();
                
                const id = btn.dataset.id || btn.dataset.screeningId || btn.dataset.candidateId;
                const name = btn.dataset.name || btn.dataset.jobTitle || btn.dataset.candidateName || 'item';
                const endpoint = btn.dataset.endpoint || `/dashboard/delete/${id}`;
                
                if (!id) {
                    showNotification('No ID found for deletion', 'error');
                    return;
                }
                
                if (!confirm(`Delete "${name}"?`)) return;
                
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                try {
                    const response = await fetch(endpoint, {
                        method: 'DELETE',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        throw new Error('Server returned HTML instead of JSON');
                    }
                    
                    const data = await response.json();
                    
                    if (!response.ok || !data.success) {
                        throw new Error(data.message || data.error || `HTTP ${response.status}`);
                    }
                    
                    // Remove element
                    const element = btn.closest('.card, .row, .list-item');
                    if (element) {
                        element.style.transition = 'opacity 0.3s ease';
                        element.style.opacity = '0';
                        setTimeout(() => {
                            element.remove();
                            showNotification(`Successfully deleted "${name}"`, 'success');
                        }, 300);
                    }
                    
                } catch (error) {
                    console.error('❌ Delete failed:', error);
                    showNotification(`Delete failed: ${error.message}`, 'error');
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            });
        }
    });

    console.log('✅ Dashboard event handlers initialized');
});
