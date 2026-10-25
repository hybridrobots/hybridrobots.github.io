(function () {
  "use strict";

  var CONFIG = {
    toEmail: "hybridautonomousbotsystems@gmail.com",
    durationMin: 30,
    timezone: "Europe/Athens",
    daysAhead: 14,
    weekdays: { 1: true, 2: true, 3: true, 4: true, 5: true },
    startHour: 10,
    endHour: 17,
    eventTitle: "Discovery call — Hybrid Autonomous Bot Systems",
  };

  var form = document.getElementById("book");
  if (!form) return;

  var daysEl = document.getElementById("bookDays");
  var slotsEl = document.getElementById("bookSlots");
  var slotsLabel = document.getElementById("bookSlotsLabel");
  var statusEl = document.getElementById("bookStatus");
  var selectedDay = null;
  var selectedSlot = null;

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function partsInZone(date, timeZone) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(date);
    var out = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type !== "literal") out[parts[i].type] = parts[i].value;
    }
    if (out.hour === "24") out.hour = "00";
    return out;
  }

  function weekdayNumber(short) {
    return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }[short];
  }

  function dayKey(p) {
    return p.year + "-" + p.month + "-" + p.day;
  }

  function formatDayLabel(p) {
    return p.weekday + " " + p.day + "/" + p.month;
  }

  function buildDays() {
    var days = [];
    var now = partsInZone(new Date(), CONFIG.timezone);
    var y = parseInt(now.year, 10);
    var m = parseInt(now.month, 10);
    var d = parseInt(now.day, 10);

    for (var i = 0; i < 40 && days.length < CONFIG.daysAhead; i++) {
      var probe = new Date(Date.UTC(y, m - 1, d + i, 12, 0, 0));
      var p = partsInZone(probe, CONFIG.timezone);
      var wd = weekdayNumber(p.weekday);
      if (!CONFIG.weekdays[wd]) continue;
      days.push({
        key: dayKey(p),
        label: formatDayLabel(p),
        year: p.year,
        month: p.month,
        day: p.day,
      });
    }
    return days;
  }

  function slotsForDay(day) {
    var slots = [];
    var nowParts = partsInZone(new Date(), CONFIG.timezone);
    var todayKey = dayKey(nowParts);
    var nowMinutes = parseInt(nowParts.hour, 10) * 60 + parseInt(nowParts.minute, 10);
    var startBound = CONFIG.startHour * 60;
    var endBound = CONFIG.endHour * 60;

    for (var minutes = startBound; minutes + CONFIG.durationMin <= endBound; minutes += CONFIG.durationMin) {
      if (day.key === todayKey && minutes <= nowMinutes + 60) continue;

      var h = Math.floor(minutes / 60);
      var m = minutes % 60;
      var endTotal = minutes + CONFIG.durationMin;
      var endH = Math.floor(endTotal / 60);
      var endM = endTotal % 60;

      slots.push({
        start: pad(h) + ":" + pad(m),
        end: pad(endH) + ":" + pad(endM),
        label: pad(h) + ":" + pad(m),
      });
    }
    return slots;
  }

  function clearPressed(root) {
    var chips = root.querySelectorAll(".book-chip");
    for (var i = 0; i < chips.length; i++) chips[i].setAttribute("aria-pressed", "false");
  }

  function selectDay(day, btn) {
    selectedDay = day;
    selectedSlot = null;
    clearPressed(daysEl);
    btn.setAttribute("aria-pressed", "true");
    renderSlots(day);
    setStatus("");
  }

  function renderDays() {
    var days = buildDays();
    daysEl.innerHTML = "";
    days.forEach(function (day, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-chip";
      btn.textContent = day.label;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        selectDay(day, btn);
      });
      daysEl.appendChild(btn);
      if (index === 0) selectDay(day, btn);
    });
  }

  function renderSlots(day) {
    var slots = slotsForDay(day);
    slotsEl.innerHTML = "";
    slotsEl.hidden = false;
    if (slotsLabel) {
      slotsLabel.hidden = false;
      slotsLabel.textContent = "Available times · " + day.label + " · Europe/Athens";
    }
    if (!slots.length) {
      var empty = document.createElement("p");
      empty.className = "book-empty";
      empty.textContent = "No remaining slots this day. Pick another date.";
      slotsEl.appendChild(empty);
      return;
    }
    slots.forEach(function (slot) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book-chip book-chip-time";
      btn.textContent = slot.label;
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        selectedSlot = slot;
        clearPressed(slotsEl);
        btn.setAttribute("aria-pressed", "true");
        setStatus("");
      });
      slotsEl.appendChild(btn);
    });
  }

  function setStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("is-ok", !!ok);
    statusEl.classList.toggle("is-err", !!msg && !ok);
  }

  function icsEscape(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  }

  function buildIcs(day, slot, name, email, notes) {
    var stamp = new Date();
    var stampUtc =
      stamp.getUTCFullYear() +
      pad(stamp.getUTCMonth() + 1) +
      pad(stamp.getUTCDate()) +
      "T" +
      pad(stamp.getUTCHours()) +
      pad(stamp.getUTCMinutes()) +
      pad(stamp.getUTCSeconds()) +
      "Z";
    var start = day.year + day.month + day.day + "T" + slot.start.replace(":", "") + "00";
    var end = day.year + day.month + day.day + "T" + slot.end.replace(":", "") + "00";
    var uid =
      "habs-" + start + "-" + Math.random().toString(36).slice(2, 10) + "@hybrid-autonomous-bot-systems";
    var desc = "Requested by " + name + " (" + email + ")";
    if (notes) desc += "\n\n" + notes;
    desc += "\n\nConfirmation pending — Hybrid Autonomous Bot Systems";

    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Hybrid Autonomous Bot Systems//Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + stampUtc,
      "DTSTART;TZID=" + CONFIG.timezone + ":" + start,
      "DTEND;TZID=" + CONFIG.timezone + ":" + end,
      "SUMMARY:" + icsEscape(CONFIG.eventTitle),
      "DESCRIPTION:" + icsEscape(desc),
      "STATUS:TENTATIVE",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }

  function downloadIcs(content, filename) {
    var blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = (form.elements.namedItem("bookName").value || "").trim();
    var email = (form.elements.namedItem("bookEmail").value || "").trim();
    var notes = (form.elements.namedItem("bookNotes").value || "").trim();

    if (!selectedDay || !selectedSlot) {
      setStatus("Choose a day and a time slot.", false);
      return;
    }
    if (!name || !email) {
      setStatus("Name and email are required.", false);
      return;
    }

    var when =
      selectedDay.label +
      " · " +
      selectedSlot.start +
      "–" +
      selectedSlot.end +
      " (" +
      CONFIG.timezone +
      ")";
    var subject = "Call request: " + when;
    var bodyLines = [
      "Hi,",
      "",
      "I'd like to book a " + CONFIG.durationMin + "-minute discovery call.",
      "",
      "Preferred time: " + when,
      "Name: " + name,
      "Email: " + email,
    ];
    if (notes) {
      bodyLines.push("Notes: " + notes);
    }
    bodyLines.push("", "— sent from the Hybrid Autonomous Bot Systems site");

    var ics = buildIcs(selectedDay, selectedSlot, name, email, notes);
    downloadIcs(
      ics,
      "habs-call-" + selectedDay.key + "-" + selectedSlot.start.replace(":", "") + ".ics"
    );

    window.location.href =
      "mailto:" +
      encodeURIComponent(CONFIG.toEmail) +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(bodyLines.join("\n"));

    setStatus(
      "Calendar file downloaded. Your email app should open with the request — send it to confirm. We’ll reply to lock the slot.",
      true
    );
  });

  renderDays();
})();
