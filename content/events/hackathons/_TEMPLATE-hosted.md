---
title: "[EVENT NAME] [YEAR]"
date: YYYY-MM-DD
summary: "[One-line description of the hackathon]"
image: /images/[PLACEHOLDER].webp
---

<div class="hackathon-page">

<!-- hackathon-hero--quantum adds the animated particle canvas behind the
     hero (injected by the slug page). Keep the hero-text wrapper — the hero
     text colors are scoped to it. The hero-logo img is optional. -->
<div class="hackathon-hero hackathon-hero--quantum">
  <div class="hackathon-hero-inner">
    <div class="hackathon-hero-text">
      <p class="hackathon-hero-eyebrow">[MONTH DAY]-[DAY], [YEAR] &bull; [CITY, STATE]</p>
      <h1>[EVENT NAME] [YEAR]</h1>
      <p class="hackathon-hero-tagline">[Catchy tagline describing the event]</p>
    </div>
    <img src="/images/[EVENT-LOGO].svg" class="hackathon-hero-logo" alt="[EVENT NAME] logo" />
  </div>
</div>

<!-- Optional live countdown (rendered by the slug page's EventCountdown):
     data-target / data-end        — start/end, ISO 8601 with explicit UTC offset
     data-sr-summary               — static date sentence for screen readers
     data-ended-message            — wrap-up copy shown after data-end passes
                                     (omit for the generic default)
     data-live-message             — copy shown while the event is running
                                     (omit for the generic default)
     The CTA row uses the color variants: solid orange for the primary
     action, violet outline for the secondary (e.g. Devpost). -->
<div class="hackathon-hero-cta">
  <div class="event-countdown" data-target="[YYYY-MM-DDTHH:MM:SS-04:00]" data-end="[YYYY-MM-DDTHH:MM:SS-04:00]" data-sr-summary="The event starts [MONTH DAY, YEAR]." data-ended-message="[EVENT NAME] has wrapped. Thanks for a great weekend!" data-live-message="Happening now: [EVENT NAME] is live"></div>
  <div class="hackathon-cta-row">
    <a href="[APPLICATION URL]" target="_blank" rel="noopener noreferrer" class="hackathon-cta hackathon-cta--orange">Apply Now</a>
    <a href="[DEVPOST OR INFO URL]" target="_blank" rel="noopener noreferrer" class="hackathon-cta hackathon-cta-outline hackathon-cta--violet">View on Devpost</a>
  </div>
</div>

<div class="hackathon-section">

<!-- A section-header pairs the heading with a right-aligned action link.
     href="#participant-updates" and href="#sponsor" are magic markers: the
     hackathon slug page swaps them for modal signup/inquiry forms. -->
<div class="hackathon-section-header">
  <h2>About</h2>
  <a href="#participant-updates" class="view-all-link">Request participant updates</a>
</div>

**[EVENT NAME]** is [description of what the hackathon is, who hosts it, what makes it unique]. Over the course of [DURATION], teams of up to [N] will tackle real-world challenges using quantum computing platforms, compete for prizes, and learn from industry mentors.

[Second paragraph about accessibility, workshops, mentorship, etc.]

<!-- Optional promo video (YouTube nocookie keeps the CSP happy): -->
<div class="hackathon-video">
  <iframe src="https://www.youtube-nocookie.com/embed/[VIDEO-ID]" title="[EVENT NAME]" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>

</div>

<div class="hackathon-section">

## Key Details

<div class="hackathon-specs">
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Dates</div>
    <div class="hackathon-spec-value">[MONTH DAY – DAY, YEAR]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Location</div>
    <div class="hackathon-spec-value">[VENUE]<br/>[UNIVERSITY / CITY]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Team Size</div>
    <div class="hackathon-spec-value">[1 – N] members</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Eligibility</div>
    <div class="hackathon-spec-value">[Who can participate]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Format</div>
    <div class="hackathon-spec-value">[In-person / Hybrid / Remote]</div>
  </div>
  <div class="hackathon-spec">
    <div class="hackathon-spec-label">Cost</div>
    <div class="hackathon-spec-value">[Free / $X — what's included]</div>
  </div>
</div>

</div>

<div class="hackathon-section">

## Schedule

<div class="hackathon-schedule">
  <div class="hackathon-schedule-day">
    <h3>Day 1 <span class="hackathon-schedule-date">[DAY, DATE]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
    </div>
  </div>
  <div class="hackathon-schedule-day">
    <h3>Day 2 <span class="hackathon-schedule-date">[DAY, DATE]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
    </div>
  </div>
  <div class="hackathon-schedule-day">
    <h3>Day 3 <span class="hackathon-schedule-date">[DAY, DATE]</span></h3>
    <div class="hackathon-schedule-items">
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
      <div class="hackathon-schedule-item"><span class="hackathon-time">[TIME]</span><span class="hackathon-schedule-event">[Activity]</span></div>
    </div>
  </div>
</div>

</div>

<div class="hackathon-section">

## Challenge Tracks

<div class="hackathon-tracks">
  <div class="hackathon-track">
    <span class="hackathon-track-num" aria-hidden="true">01</span>
    <div class="hackathon-track-body">
      <h3>[Track 1 Name]</h3>
      <p>[Description of this challenge track]</p>
    </div>
    <div class="hackathon-track-slot">
      <span class="hackathon-track-slot-label">Track sponsor</span>
      <span class="hackathon-track-slot-box">[SPONSOR or "Coming soon"]</span>
    </div>
  </div>
  <div class="hackathon-track">
    <span class="hackathon-track-num" aria-hidden="true">02</span>
    <div class="hackathon-track-body">
      <h3>[Track 2 Name]</h3>
      <p>[Description of this challenge track]</p>
    </div>
    <div class="hackathon-track-slot">
      <span class="hackathon-track-slot-label">Track sponsor</span>
      <span class="hackathon-track-slot-box">[SPONSOR or "Coming soon"]</span>
    </div>
  </div>
  <div class="hackathon-track">
    <span class="hackathon-track-num" aria-hidden="true">03</span>
    <div class="hackathon-track-body">
      <h3>[Track 3 Name]</h3>
      <p>[Description of this challenge track]</p>
    </div>
    <div class="hackathon-track-slot">
      <span class="hackathon-track-slot-label">Track sponsor</span>
      <span class="hackathon-track-slot-box">[SPONSOR or "Coming soon"]</span>
    </div>
  </div>
</div>

</div>

<div class="hackathon-section">

## Prizes

<!-- Three parallel award categories styled as equals (not ranked). -->
<div class="hackathon-prizes">
  <div class="hackathon-prize">
    <h3>Track Winners</h3>
    <p class="hackathon-prize-value">[PRIZE VALUE]</p>
    <p>[Description]</p>
  </div>
  <div class="hackathon-prize">
    <h3>Grand Prize</h3>
    <p class="hackathon-prize-value">[PRIZE VALUE]</p>
    <p>[Description]</p>
  </div>
  <div class="hackathon-prize">
    <h3>[Special Award]</h3>
    <p class="hackathon-prize-value">[PRIZE VALUE]</p>
    <p>[Description]</p>
  </div>
</div>

</div>

<div class="hackathon-section">

## Resources

<div class="hackathon-resources-grid">
  <a class="hackathon-resource-card" href="[URL]">
    <div class="hackathon-resource-icon">[EMOJI]</div>
    <div class="hackathon-resource-title">[Resource Name]</div>
    <div class="hackathon-resource-desc">[Short description]</div>
  </a>
  <a class="hackathon-resource-card" href="[URL]" target="_blank">
    <div class="hackathon-resource-icon">[EMOJI]</div>
    <div class="hackathon-resource-title">[Resource Name]</div>
    <div class="hackathon-resource-desc">[Short description]</div>
  </a>
</div>

</div>

<div class="hackathon-section">

## Sponsors

[EVENT NAME] is made possible by the generous support of our sponsors.

<div class="hackathon-sponsors">
  <div class="hackathon-sponsor-tier">
    <h3>Title Sponsors</h3>
    <div class="hackathon-sponsor-logos">
      <div class="hackathon-sponsor-logo">[Sponsor Logo / Name]</div>
    </div>
  </div>
  <div class="hackathon-sponsor-tier">
    <h3>Gold Sponsors</h3>
    <div class="hackathon-sponsor-logos">
      <div class="hackathon-sponsor-logo">[Sponsor Logo / Name]</div>
    </div>
  </div>
</div>

<!-- href="#sponsor" is a magic marker: the slug page swaps it for the
     sponsorship-inquiry modal form. -->
<div class="hackathon-sponsor-cta">
  <p>Interested in sponsoring [EVENT NAME]?</p>
  <a href="#sponsor" class="hackathon-cta hackathon-cta-outline">Become a Sponsor</a>
</div>

</div>

<div class="hackathon-section">

## Hackathon Committee

<div class="hackathon-team-grid">
  <div class="hackathon-team-member">
    <img src="/images/[NAME].jpg" alt="[Full Name]" class="hackathon-team-photo" loading="lazy" />
    <div class="hackathon-team-name">[Full Name]</div>
    <div class="hackathon-team-role">[Role, e.g. Challenge Lead]</div>
  </div>
</div>

</div>

<div class="hackathon-section hackathon-apply" id="apply">

## Ready to Hack the Quantum Future?

Applications are open! Apply by **[DEADLINE DATE]** to secure your spot.

<a href="[APPLICATION URL]" class="hackathon-cta">Apply Now</a>

<p class="hackathon-apply-note">Have questions? Reach out at <a href="mailto:[EMAIL]">[EMAIL]</a>.</p>

</div>

</div>
