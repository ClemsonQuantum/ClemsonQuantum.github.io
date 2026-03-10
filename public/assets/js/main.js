// Floating nested submenus: clone submenu content and append to body on hover
// to avoid clipping/overflow from the dropdown panel.
document.addEventListener('DOMContentLoaded', function () {
  var allSubmenus = [];

  function clearAllExcept(keep) {
    allSubmenus.forEach(function (entry) {
      if (entry === keep) return;
      if (entry.removeTimer) { clearTimeout(entry.removeTimer); entry.removeTimer = null; }
      if (entry.floating && entry.floating.parentElement) {
        entry.floating.parentElement.removeChild(entry.floating);
      }
      entry.floating = null;
    });
  }

  var submenuParents = document.querySelectorAll('.dropdown-submenu');
  submenuParents.forEach(function (parent) {
    var original = parent.querySelector('.dropdown-submenu-content');
    if (!original) return;

    var entry = { floating: null, removeTimer: null };
    allSubmenus.push(entry);

    function createFloating() {
      if (entry.floating) return entry.floating;
      entry.floating = original.cloneNode(true);
      entry.floating.classList.add('floating-submenu');
      entry.floating.style.display = 'block';
      entry.floating.style.opacity = '1';
      entry.floating.style.pointerEvents = 'auto';
      entry.floating.style.position = 'fixed';
      entry.floating.style.zIndex = '3000';
      document.body.appendChild(entry.floating);

      entry.floating.addEventListener('mouseenter', function () {
        if (entry.removeTimer) { clearTimeout(entry.removeTimer); entry.removeTimer = null; }
      });
      entry.floating.addEventListener('mouseleave', scheduleRemove);

      // Ensure cloned links navigate on click
      var links = entry.floating.querySelectorAll('a[href]');
      links.forEach(function (link) {
        link.addEventListener('click', function (e) {
          var href = link.getAttribute('href');
          if (!href) return;
          if (link.getAttribute('target') === '_blank') return;
          e.preventDefault();
          window.location.href = href;
        });
      });

      return entry.floating;
    }

    function positionFloating() {
      if (!entry.floating) return;
      var triggerRect = parent.getBoundingClientRect();
      var left = Math.min(
        window.innerWidth - entry.floating.offsetWidth - 8,
        Math.round(triggerRect.right + 8)
      );
      var top = Math.max(8, Math.round(triggerRect.top));
      entry.floating.style.left = left + 'px';
      entry.floating.style.top = top + 'px';
    }

    function scheduleRemove() {
      if (entry.removeTimer) clearTimeout(entry.removeTimer);
      entry.removeTimer = setTimeout(function () {
        if (entry.floating && entry.floating.parentElement) {
          entry.floating.parentElement.removeChild(entry.floating);
        }
        entry.floating = null;
        entry.removeTimer = null;
      }, 120);
    }

    parent.addEventListener('mouseenter', function () {
      // Skip on mobile (submenu content is shown inline)
      if (window.innerWidth < 768) return;
      clearAllExcept(entry);
      if (entry.removeTimer) { clearTimeout(entry.removeTimer); entry.removeTimer = null; }
      createFloating();
      positionFloating();
    });

    parent.addEventListener('mousemove', function () {
      if (entry.floating) positionFloating();
    });

    parent.addEventListener('mouseleave', scheduleRemove);
  });
});
