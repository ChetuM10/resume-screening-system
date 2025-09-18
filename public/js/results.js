/**
 * Enhanced Results Page JavaScript
 * Handles candidate filtering, sorting, and interactions
 */

document.addEventListener('DOMContentLoaded', function() {
  
  // ==================== FILTERING FUNCTIONALITY ====================
  
  const filterInput = document.getElementById('minMatchScore');
  const candidateCards = document.querySelectorAll('.candidate-result-card, .screening-candidate-card, .card');
  
  if (filterInput) {
    filterInput.addEventListener('input', debounce(function() {
      const minScore = Number(this.value) || 0;
      let visibleCount = 0;
      
      candidateCards.forEach(card => {
        const scoreElement = card.querySelector('.match-score-display, .badge');
        const scoreText = scoreElement ? scoreElement.textContent : '0';
        const score = Number(scoreText.replace('%', '').replace('Score:', '').trim()) || 0;
        
        if (score >= minScore) {
          card.style.display = '';
          card.classList.add('fade-in');
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.classList.remove('fade-in');
        }
      });
      
      updateResultsCount(visibleCount);
    }, 300));
  }

  // ==================== SORTING FUNCTIONALITY ====================
  
  const sortSelect = document.getElementById('sortResults');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      sortResults(this.value);
    });
  }

  // ==================== CANDIDATE CARD INTERACTIONS ====================
  
  // Add hover effects to candidate cards
  candidateCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '';
    });
  });

  // ==================== SEARCH FUNCTIONALITY ====================
  
  const searchInput = document.getElementById('candidateSearch');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function() {
      const searchTerm = this.value.toLowerCase().trim();
      let visibleCount = 0;
      
      candidateCards.forEach(card => {
        const candidateName = card.querySelector('.candidate-name, h5')?.textContent?.toLowerCase() || '';
        const candidateSkills = card.querySelector('.resume-skills, .skills-section')?.textContent?.toLowerCase() || '';
        const candidateEmail = card.querySelector('.contact-item')?.textContent?.toLowerCase() || '';
        
        const isMatch = candidateName.includes(searchTerm) || 
                       candidateSkills.includes(searchTerm) || 
                       candidateEmail.includes(searchTerm);
        
        if (isMatch || searchTerm === '') {
          card.style.display = '';
          card.classList.add('fade-in');
          visibleCount++;
        } else {
          card.style.display = 'none';
          card.classList.remove('fade-in');
        }
      });
      
      updateResultsCount(visibleCount);
    }, 300));
  }

  // ==================== BULK ACTIONS ====================
  
  const selectAllCheckbox = document.getElementById('selectAll');
  const candidateCheckboxes = document.querySelectorAll('.candidate-checkbox');
  const bulkActionBtn = document.getElementById('bulkActionBtn');
  
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', function() {
      candidateCheckboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
      });
      updateBulkActionButton();
    });
  }
  
  candidateCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateBulkActionButton);
  });

  // ==================== EXPORT FUNCTIONALITY ====================
  
  const exportBtn = document.getElementById('exportResults');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      exportResults();
    });
  }

  // ==================== UTILITY FUNCTIONS ====================
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  function sortResults(sortBy) {
    const container = document.querySelector('.screening-results-grid, .results-container');
    if (!container) return;
    
    const cards = Array.from(candidateCards);
    
    cards.sort((a, b) => {
      switch (sortBy) {
        case 'score-desc':
          return getCardScore(b) - getCardScore(a);
        case 'score-asc':
          return getCardScore(a) - getCardScore(b);
        case 'name-asc':
          return getCardName(a).localeCompare(getCardName(b));
        case 'name-desc':
          return getCardName(b).localeCompare(getCardName(a));
        case 'experience-desc':
          return getCardExperience(b) - getCardExperience(a);
        default:
          return 0;
      }
    });
    
    // Re-append sorted cards
    cards.forEach(card => container.appendChild(card));
    
    // Add animation
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }
  
  function getCardScore(card) {
    const scoreElement = card.querySelector('.match-score-display, .badge');
    const scoreText = scoreElement ? scoreElement.textContent : '0';
    return Number(scoreText.replace('%', '').replace('Score:', '').trim()) || 0;
  }
  
  function getCardName(card) {
    const nameElement = card.querySelector('.candidate-name, h5');
    return nameElement ? nameElement.textContent.trim() : '';
  }
  
  function getCardExperience(card) {
    const expElement = card.querySelector('.resume-info-item');
    const expText = expElement ? expElement.textContent : '0';
    const match = expText.match(/(\d+)\s*years?/i);
    return match ? parseInt(match[1]) : 0;
  }
  
  function updateResultsCount(count) {
    const countElement = document.querySelector('.results-count');
    if (countElement) {
      countElement.textContent = `Showing ${count} candidate${count !== 1 ? 's' : ''}`;
    }
  }
  
  function updateBulkActionButton() {
    const checkedBoxes = document.querySelectorAll('.candidate-checkbox:checked');
    if (bulkActionBtn) {
      if (checkedBoxes.length > 0) {
        bulkActionBtn.style.display = 'inline-block';
        bulkActionBtn.textContent = `Actions (${checkedBoxes.length})`;
      } else {
        bulkActionBtn.style.display = 'none';
      }
    }
  }
  
  function exportResults() {
    const visibleCards = Array.from(candidateCards).filter(card => 
      card.style.display !== 'none'
    );
    
    const csvContent = generateCSV(visibleCards);
    downloadCSV(csvContent, 'screening-results.csv');
  }
  
  function generateCSV(cards) {
    const headers = ['Name', 'Email', 'Score', 'Experience', 'Skills'];
    const rows = [headers];
    
    cards.forEach(card => {
      const name = getCardName(card);
      const email = card.querySelector('.contact-item')?.textContent?.trim() || '';
      const score = getCardScore(card);
      const experience = getCardExperience(card);
      const skills = card.querySelector('.resume-skills')?.textContent?.trim() || '';
      
      rows.push([name, email, score, experience, skills]);
    });
    
    return rows.map(row => row.join(',')).join('\n');
  }
  
  function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ==================== LOADING STATES ====================
  
  function showLoading(element) {
    element.style.opacity = '0.6';
    element.style.pointerEvents = 'none';
    
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    element.appendChild(loader);
  }
  
  function hideLoading(element) {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
    
    const loader = element.querySelector('.loading-overlay');
    if (loader) {
      loader.remove();
    }
  }

  // ==================== INITIALIZE ====================
  
  console.log('✅ Results page JavaScript initialized');
  console.log(`📊 Found ${candidateCards.length} candidate cards`);
  
  // Add initial animations
  candidateCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      card.style.transition = 'all 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 100);
  });
});
