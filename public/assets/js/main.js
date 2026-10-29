/**
 * PCTE Alumni Talks - Main Global Script
 */

document.addEventListener('DOMContentLoaded', () => {
  syncNavbarAuth();
});

function syncNavbarAuth() {
  const session = localStorage.getItem('pcte_logged_user');
  const slot1 = document.getElementById('authNavSlot1') || document.querySelector('.navbar-nav .ms-lg-3');
  const slot2 = document.getElementById('authNavSlot2') || document.querySelector('.navbar-nav .ms-lg-2');

  if (session && slot1 && slot2) {
    const user = JSON.parse(session);
    // Route to Admin Control Center or Student/Alumni Dashboard accordingly
    const dashboardPage = (user.role === 'Admin') ? 'dashboard-admin.html' : 'dashboard.html';

    // Replace Login button with Dashboard link
    slot1.innerHTML = `
      <a class="btn btn-nav-outline text-warning fw-semibold" href="${dashboardPage}">
        <i class="bi bi-speedometer2 me-1"></i> Dashboard
      </a>
    `;

    // Replace Register button with Logout button
    slot2.innerHTML = `
      <button onclick="logoutUser()" class="btn btn-nav-primary">
        Logout
      </button>
    `;
  }
}

function logoutUser() {
  localStorage.removeItem('pcte_logged_user');
  window.location.href = 'index.html';
}