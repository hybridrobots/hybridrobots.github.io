(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("siteNav");
  var progress = document.getElementById("scrollProgress");
  var hero = document.querySelector(".hero");
  var links = nav ? nav.querySelectorAll('a[href^="#"]') : [];
  var sectionIds = [];

  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute("href") || "";
    if (href.length > 1) sectionIds.push(href.slice(1));
  }

  function setOpen(open) {
    if (!header || !toggle || !nav) return;
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-drawer-open", open);
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("nav-open"));
    });
  }

  if (nav) {
    nav.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a) setOpen(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  function onScrollChrome() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    if (hero) hero.classList.toggle("is-scrolled-away", window.scrollY > 48);
    if (progress) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = pct + "%";
    }
  }

  function setActive() {
    var offset = (header ? header.offsetHeight : 72) + 24;
    var current = "";
    for (var i = 0; i < sectionIds.length; i++) {
      var el = document.getElementById(sectionIds[i]);
      if (!el) continue;
      if (el.getBoundingClientRect().top - offset <= 0) current = sectionIds[i];
    }
    for (var j = 0; j < links.length; j++) {
      var id = (links[j].getAttribute("href") || "").slice(1);
      var on = id && id === current;
      links[j].classList.toggle("is-active", on);
      if (on) links[j].setAttribute("aria-current", "true");
      else links[j].removeAttribute("aria-current");
    }
  }

  window.addEventListener(
    "scroll",
    function () {
      onScrollChrome();
      setActive();
    },
    { passive: true }
  );

  onScrollChrome();
  setActive();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add("is-in");
            io.unobserve(entries[i].target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    var reveals = document.querySelectorAll(".reveal");
    for (var r = 0; r < reveals.length; r++) io.observe(reveals[r]);
  } else {
    var all = document.querySelectorAll(".reveal");
    for (var k = 0; k < all.length; k++) all[k].classList.add("is-in");
  }
})();
