/**
 * PCTE Alumni Talks — Main Global Script
 */

document.addEventListener('DOMContentLoaded', () => {
  syncNavbarAuth();
});

function syncNavbarAuth() {
  let user = null;
  try {
    if (window.API && typeof API.getCurrentUser === 'function') {
      user = API.getCurrentUser();
    } else {
      const stored = localStorage.getItem('pcte_logged_user');
      user = stored ? JSON.parse(stored) : null;
    }
  } catch (e) {
    user = null;
  }

  const slot1 = document.getElementById('authNavSlot1') || document.querySelector('.navbar-nav .ms-lg-3');
  const slot2 = document.getElementById('authNavSlot2') || document.querySelector('.navbar-nav .ms-lg-2');

  if (user && slot1 && slot2) {
    const dashboardPage = (user.role === 'Admin') ? 'dashboard-admin.html' : 'dashboard.html';

    slot1.innerHTML = `
      <a class="btn btn-nav-outline text-warning fw-semibold" href="${dashboardPage}">
        <i class="bi bi-speedometer2 me-1"></i> Dashboard
      </a>
    `;

    slot2.innerHTML = `
      <button onclick="logoutUser()" class="btn btn-nav-primary">
        Logout
      </button>
    `;
  }
}

function logoutUser() {
  if (window.API && typeof API.logout === 'function') {
    API.logout();
  } else {
    localStorage.removeItem('pcte_logged_user');
    localStorage.removeItem('pcte_token');
    window.location.href = 'index.html';
  }
}
