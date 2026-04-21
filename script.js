(function () {
  'use strict';

  const video = document.querySelector('.hero-video');
  const placeholder = document.querySelector('.video-placeholder');

  // Hide placeholder when video has a valid src and show video
  if (video && placeholder) {
    if (video.src && video.src.length > 0 && !video.src.endsWith(window.location.href)) {
      placeholder.style.display = 'none';
    }
    video.addEventListener('loadeddata', function () {
      placeholder.style.display = 'none';
    });
  }

  // Optional: mobile menu toggle
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      menuBtn.classList.toggle('is-active');
    });
  }
})();
