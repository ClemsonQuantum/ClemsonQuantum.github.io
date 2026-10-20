---
title: "[EVENT NAME]"
date: YYYY-MM-DD
summary: "[One-line description of the hackathon]"
# Also the link-preview image: a 16:9 banner at 1200×675.
image: /images/[PLACEHOLDER].webp
# Multi-day events: `dateDisplay` shows the full range on the card.
# dateDisplay: "[MONTH DAY–DAY, YEAR]"
# Optional. `end_date` and `location` together emit Event structured data (see
# content/README.md); `street_address` and `registration_url` add to it.
# end_date: YYYY-MM-DD
# location: "[VENUE NAME]"
# street_address: "[STREET ADDRESS]"
# registration_url: "https://[REGISTRATION LINK]"
---

<!-- Built from the SC Quantathon v3 page (sc-quantathon-v3-2026.md): copy a
     block from there when you need a filled-in example. Delete any section
     the event doesn't need. -->
<div class="hackathon-page">

<!-- hackathon-hero--quantum adds the animated particle canvas behind the
     hero. Keep the hero-text wrapper: the hero text colors are scoped to it.
     The hero-logo img is optional; give it the file's real width and height. -->
<div class="hackathon-hero hackathon-hero--quantum">
  <div class="hackathon-hero-inner">
    <div class="hackathon-hero-text">
      <p class="hackathon-hero-eyebrow">[MONTH DAY–DAY, YEAR] • [CITY, STATE]</p>
      <h1>[EVENT NAME]</h1>
      <p class="hackathon-hero-tagline">[One plain sentence: what the event is, where, and who sets the challenges.]</p>
    </div>
    <img src="/images/[EVENT-LOGO].svg" class="hackathon-hero-logo" alt="" width="[WIDTH]" height="[HEIGHT]" />
  </div>
</div>

<!-- Optional live countdown (EventCountdown):
     data-target / data-end        start/end, ISO 8601 with explicit UTC offset
                                   (the content validator checks both parse)
     data-sr-summary               static date sentence for screen readers
     data-ended-message            wrap-up copy shown after data-end passes
     data-live-message             copy shown while the event is running
     The buttons: hackathon-cta--secondary (violet fill) for the main action
     (Apply while applications are open, Devpost once teams submit), and
     hackathon-cta--ghost (violet outline) for a reference like the bootcamp.
     SC Quantathon v4 uses a numbered route instead; see "Hero route" in
     content/README.md. -->
<div class="hackathon-hero-cta">
  <div class="event-countdown" data-target="[YYYY-MM-DDTHH:MM:SS-04:00]" data-end="[YYYY-MM-DDTHH:MM:SS-04:00]" data-sr-summary="The event starts [MONTH DAY, YEAR]." data-ended-message="[EVENT NAME] has ended. Thanks to everyone who took part." data-live-message="Happening now: [EVENT NAME] is live"></div>
  <div class="hackathon-cta-row">
    <a href="[BOOTCAMP URL]" class="hackathon-cta hackathon-cta--ghost">Bootcamp</a>
    <a href="[APPLICATION OR DEVPOST URL]" target="_blank" rel="noopener noreferrer" class="hackathon-cta hackathon-cta--secondary">[Apply or Devpost]</a>
  </div>
</div>

<div class="hackathon-section">

## About

**[EVENT NAME]** is [what it is and who hosts it]. [Dates, team size, and who writes the challenges.]

<!-- href="#participant-updates" is a marker: the event page turns the link
     into a sign-up form. data-event names the event in the form’s title and
     email subject; the content validator requires it. -->
[What the weekend looks like: mentors, workshops, sponsor talks.] For event news, you can <a href="#participant-updates" data-event="[EVENT NAME]">request participant updates</a>.

<p>Past editions: <a href="[URL]" target="_blank" rel="noopener noreferrer">[EVENT NAME, EARLIER EDITION (YEAR)]</a> and <a href="[URL]" target="_blank" rel="noopener noreferrer">[EVENT NAME, EARLIER EDITION (YEAR)]</a>.</p>

<!-- Optional video. YouTube's youtube-nocookie.com address is the one the
     site's security policy allows. -->
<div class="hackathon-video">
  <iframe src="https://www.youtube-nocookie.com/embed/[VIDEO-ID]" title="[VIDEO TITLE]" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

</div>

<div class="hackathon-section">

## Key Details

<div class="hackathon-specs">
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Dates</div>
    <div class="hackathon-spec-value">[MONTH DAY–DAY, YEAR]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Team Size</div>
    <div class="hackathon-spec-value">[3–5] students</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Eligibility</div>
    <div class="hackathon-spec-value">[Who can participate]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Format</div>
    <div class="hackathon-spec-value">[In person / Hybrid / Remote]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Cost</div>
    <div class="hackathon-spec-value">[Free to attend, and what’s provided]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Prizes</div>
    <div class="hackathon-spec-value">[Prizes, or when they will be announced]</div>
  </div>
</div>

<!-- Map links: put the venue name and address into both URLs, with + for
     spaces. -->
<div class="hackathon-venue">
  <div class="hackathon-venue-text">
    <div class="hackathon-spec-label">Venue</div>
    <p class="hackathon-venue-name">[VENUE NAME]</p>
    <p class="hackathon-venue-address">[STREET ADDRESS, CITY, STATE ZIP]</p>
    <p>[Where to check in, and where shuttles or rideshares drop off.]</p>
    <p class="hackathon-venue-links"><a href="https://maps.apple.com/?q=[VENUE+NAME]&amp;address=[STREET+ADDRESS,+CITY,+STATE+ZIP]" target="_blank" rel="noopener noreferrer">Open in Apple Maps</a> · <a href="https://www.google.com/maps/search/?api=1&amp;query=[VENUE+NAME+STREET+ADDRESS+CITY+STATE]" target="_blank" rel="noopener noreferrer">Google Maps</a></p>
  </div>
</div>

</div>

<div class="hackathon-section">

## Schedule

<div class="hackathon-schedule">
  <div class="hackathon-schedule-day">
    <h3>Day 1 <span class="hackathon-schedule-date">[WEEKDAY, MONTH DAY]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Check-in</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Welcome ceremony</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
    </div>
  </div>
  <div class="hackathon-schedule-day">
    <h3>Day 2 <span class="hackathon-schedule-date">[WEEKDAY, MONTH DAY]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Opening ceremony</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Hacking begins</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
    </div>
  </div>
  <div class="hackathon-schedule-day">
    <h3>Day 3 <span class="hackathon-schedule-date">[WEEKDAY, MONTH DAY]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Project submissions due</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Judging presentations</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">Awards ceremony</span></div>
    </div>
  </div>
</div>

</div>

<div class="hackathon-section">

## Challenges

<!-- One row per challenge, with the sponsor's logo (linked to its site) in
     the left column. Use a <picture> with a dark-mode <source>, as in the
     second row, when the logo has a white version for the dark theme. For a
     hover tint in the sponsor's color, add hackathon-track--brand and a
     sponsor class that sets --track-rgb in assets/css/style.css (as
     .hackathon-track--srnl does); without them the row uses the site accent. -->
<div class="hackathon-tracks">
  <div class="hackathon-track hackathon-track--logo">
    <a class="hackathon-track-link" href="[SPONSOR URL]" target="_blank" rel="noopener noreferrer">
      <img src="/images/[SPONSOR-LOGO].svg" alt="[SPONSOR NAME]" class="hackathon-track-logo" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
    </a>
    <div class="hackathon-track-body">
      <h3>[SPONSOR] Challenge</h3>
      <p>[One sentence on who the sponsor is, then what the challenge asks teams to build. Say when the full brief comes out.]</p>
    </div>
  </div>
  <div class="hackathon-track hackathon-track--logo">
    <a class="hackathon-track-link" href="[SPONSOR URL]" target="_blank" rel="noopener noreferrer">
      <picture>
        <source srcset="/images/[SPONSOR-LOGO]-white.webp" media="(prefers-color-scheme: dark)" />
        <img src="/images/[SPONSOR-LOGO].webp" alt="[SPONSOR NAME]" class="hackathon-track-logo" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
      </picture>
    </a>
    <div class="hackathon-track-body">
      <h3>[SPONSOR] Challenge</h3>
      <p>[One sentence on who the sponsor is, then what the challenge asks teams to build. Say when the full brief comes out.]</p>
    </div>
  </div>
</div>

</div>

<div class="hackathon-section" id="sponsors">

## Sponsors

<!-- hackathon-sponsors--paired puts the first two tiers side by side; every
     tier after them spans the full width. Each logo is a link; wrap the <img>
     in a <picture> with a dark-mode <source> when the mark has a white
     version. For a scrolling logo strip instead of tiers, see the sponsor
     carousel in content/README.md ("Interactive blocks"). -->
<div class="hackathon-sponsors hackathon-sponsors--paired">
  <div class="hackathon-sponsor-tier">
    <h3>Powered by</h3>
    <div class="hackathon-sponsor-logos">
      <a class="hackathon-sponsor-logo" href="[SPONSOR URL]" target="_blank" rel="noopener noreferrer">
        <picture>
          <source srcset="/images/[SPONSOR-LOGO]-white.webp" media="(prefers-color-scheme: dark)" />
          <img src="/images/[SPONSOR-LOGO].webp" alt="[SPONSOR NAME]" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
        </picture>
      </a>
    </div>
  </div>
  <div class="hackathon-sponsor-tier">
    <h3>Hosted by</h3>
    <div class="hackathon-sponsor-logos">
      <a class="hackathon-sponsor-logo" href="[VENUE URL]" target="_blank" rel="noopener noreferrer">
        <img src="/images/[VENUE-LOGO].webp" alt="[VENUE NAME]" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
      </a>
    </div>
  </div>
  <div class="hackathon-sponsor-tier">
    <h3>Partners</h3>
    <div class="hackathon-sponsor-logos">
      <a class="hackathon-sponsor-logo" href="[PARTNER URL]" target="_blank" rel="noopener noreferrer">
        <img src="/images/[PARTNER-LOGO].webp" alt="[PARTNER NAME]" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
      </a>
      <a class="hackathon-sponsor-logo" href="[PARTNER URL]" target="_blank" rel="noopener noreferrer">
        <img src="/images/[PARTNER-LOGO].webp" alt="[PARTNER NAME]" width="[WIDTH]" height="[HEIGHT]" loading="lazy" />
      </a>
    </div>
  </div>
</div>

</div>

<div class="hackathon-section" id="stay">

## Where to Stay

[Hotels near the venue. Dollar signs are price estimates. Say whether shuttles run between these hotels and the venue.]

<!-- The tag and the note are optional: use them for a hotel with a group
     rate. Distance is from the venue. -->
<ul class="hackathon-hotels">
  <li class="hackathon-hotel">
    <div class="hackathon-hotel-main">
      <span class="hackathon-hotel-tag">Group rate</span>
      <a class="hackathon-hotel-name" href="[HOTEL URL]" target="_blank" rel="noopener noreferrer">[HOTEL NAME]</a>
      <span class="hackathon-hotel-address">[STREET ADDRESS, CITY]</span>
      <p class="hackathon-hotel-note"><span class="hackathon-hotel-note-lead">[What the group rate includes]:</span><br>[Room type]: $[PRICE]/night</p>
    </div>
    <span class="hackathon-hotel-distance">[X.X] mi</span>
    <span class="hackathon-hotel-price">$</span>
  </li>
  <li class="hackathon-hotel">
    <div class="hackathon-hotel-main">
      <a class="hackathon-hotel-name" href="[HOTEL URL]" target="_blank" rel="noopener noreferrer">[HOTEL NAME]</a>
      <span class="hackathon-hotel-address">[STREET ADDRESS, CITY]</span>
    </div>
    <span class="hackathon-hotel-distance">[X.X] mi</span>
    <span class="hackathon-hotel-price">$$</span>
  </li>
</ul>

</div>

<div class="hackathon-section" id="faq">

## FAQ

<div class="hackathon-faq">
  <details class="hackathon-faq-item">
    <summary>Who can participate?</summary>
    <p>[Who is eligible: level of study, age, majors.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>Do I need quantum computing experience?</summary>
    <p>[No, and what support first-time participants get.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How much does it cost?</summary>
    <p>[Cost, and what’s provided.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>Do I need a team before I arrive?</summary>
    <p>[Team size, and how solo registrants are placed on a team.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>What should I bring?</summary>
    <p>[Laptop, charger, and any accounts to set up before arriving.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>Where should I stay?</summary>
    <p>See the <a href="#stay">Where to Stay</a> list above.</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How do I get to [CITY]?</summary>
    <p>[Nearest airport, shuttle times, and parking rules.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How should I prepare?</summary>
    <p>[The bootcamp or other materials to work through beforehand.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How and when do we submit?</summary>
    <p>Through <a href="[DEVPOST URL]" target="_blank" rel="noopener noreferrer">Devpost</a>. [Deadline day and time, and when judging and awards happen.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How does judging work?</summary>
    <p>[Presentation length, who judges, and which prizes are awarded.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>How do I register?</summary>
    <p>[Where to apply and the deadline.]</p>
  </details>
  <details class="hackathon-faq-item">
    <summary>Is there a code of conduct?</summary>
    <p>Yes. Everyone at the event agrees to the <a href="/code-of-conduct/">Clemson Quantum Club Code of Conduct</a>. Organizers are available all weekend if anything needs to be addressed.</p>
  </details>
</div>

</div>

<div class="hackathon-section">

## Quantathon Committee

<!-- data-start (and data-end, once the term is over) are the YYYY-MM months
     of the person's committee term; the profile comment is reference only
     and never shown. -->
<div class="hackathon-team-grid">
  <div class="hackathon-team-member" data-start="[YYYY-MM]">
    <!-- profile: [Reference notes on this person; never shown on the site] -->
    <img src="/images/[NAME].jpg" alt="" class="hackathon-team-photo" width="92" height="92" loading="lazy" />
    <div class="hackathon-team-name">[Full Name]</div>
    <div class="hackathon-team-role">[Role, e.g. Quantathon Director]</div>
  </div>
  <div class="hackathon-team-member" data-start="[YYYY-MM]">
    <!-- profile: [Reference notes on this person; never shown on the site] -->
    <img src="/images/[NAME].jpg" alt="" class="hackathon-team-photo" width="92" height="92" loading="lazy" />
    <div class="hackathon-team-name">[Full Name]</div>
    <div class="hackathon-team-role">[Role, e.g. Logistics Lead]</div>
  </div>
</div>

</div>

</div>
