(function () {
  "use strict";

  var sensors = window.sensorsDataAnalytic201505;
  var CONFIG = {
    sensorsServerUrl: "https://collect.analyse.lnearn.com/sa?project=production",
    defaultPath: "/sports",
    campaign: "playloopstudio",
  };
  var pageTraceId = getTraceId();

  setCurrentYear();
  initSensors();
  initVerification();

  document.addEventListener("contextmenu", syncTrackedHrefFromEvent, true);
  document.addEventListener("pointerdown", syncTrackedHrefFromEvent, true);
  document.addEventListener("focusin", syncTrackedHrefFromEvent, true);
  document.addEventListener("click", handleTrackedClick);

  function setCurrentYear() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function initSensors() {
    if (!sensors || typeof sensors.init !== "function") return;

    sensors.init({
      server_url: CONFIG.sensorsServerUrl,
      is_track_single_page: true,
      use_client_time: true,
      send_type: "beacon",
      show_log: false,
      heatmap: {
        clickmap: "not_collect",
        scroll_notice_map: "not_collect",
      },
    });

    setLatestUtmSourceFromInvitation();
    identifyTraceId();
    trackViewAfterLoad();
  }

  function setLatestUtmSourceFromInvitation() {
    if (!sensors || !sensors.store || typeof sensors.store.setProps !== "function") return;

    var invitationCode = new URL(window.location.href).searchParams.get("i");
    if (!invitationCode || !invitationCode.trim()) return;

    sensors.store.setProps({
      $latest_utm_source: invitationCode.trim(),
    });
  }

  function identifyTraceId() {
    if (!pageTraceId || !sensors || typeof sensors.identify !== "function") return;
    sensors.identify(pageTraceId);
  }

  function getTraceId() {
    var traceId = new URL(window.location.href).searchParams.get("trace_id");
    if (!traceId || !traceId.trim() || traceId.length > 255) return "";
    return traceId.trim();
  }

  function trackSensorsEvent(eventName, properties) {
    try {
      if (sensors && typeof sensors.track === "function") {
        sensors.track(eventName, properties);
      }
    } catch (error) {}
  }

  function trackViewAfterLoad() {
    var sendView = function () {
      trackSensorsEvent("playloopstudio_view", { trace_id: pageTraceId });
    };

    if (document.readyState === "complete") {
      sendView();
    } else {
      window.addEventListener("load", sendView, { once: true });
    }
  }

  function isValidIPv4(value) {
    var parts = value.split(".");
    if (parts.length !== 4) return false;

    for (var i = 0; i < parts.length; i += 1) {
      if (!/^\d{1,3}$/.test(parts[i])) return false;
      var number = Number(parts[i]);
      if (number < 0 || number > 255) return false;
    }
    return true;
  }

  function isValidDomain(value) {
    if (!value || value.length > 253) return false;
    if (value.charAt(0) === "-" || value.charAt(value.length - 1) === "-") return false;
    if (!/^[a-z0-9.-]+$/i.test(value) || value.indexOf(".") === -1) return false;

    var labels = value.split(".");
    for (var i = 0; i < labels.length; i += 1) {
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(labels[i])) return false;
    }
    return true;
  }

  function getOdHost() {
    var currentUrl = new URL(window.location.href);
    var odHost = String(currentUrl.searchParams.get("od") || "").trim().toLowerCase();

    if (!odHost || /[/?#@:]/.test(odHost)) return "";
    if (/^[0-9.]+$/.test(odHost)) return isValidIPv4(odHost) ? odHost : "";
    return isValidDomain(odHost) ? odHost : "";
  }

  function getOdTargetUrl() {
    var odHost = getOdHost();
    return odHost ? new URL("https://" + odHost + "/domain-v2/entrance2") : null;
  }

  function initVerification() {
    window.setTimeout(completeVerification, 3000);
  }

  function completeVerification() {
    var shield = document.getElementById("shield");
    var statusPill = document.getElementById("status-pill");
    var statusLabel = document.getElementById("status-label");
    var title = document.getElementById("status-title");
    var description = document.getElementById("status-description");
    var progress = document.getElementById("progress");
    var target = document.getElementById("continue-button");
    var targetUrl = getOdTargetUrl();

    if (shield) shield.classList.add("complete");
    if (statusPill) statusPill.classList.add("complete");
    if (statusLabel) statusLabel.textContent = "CONNECTION VERIFIED";
    if (title) title.textContent = "Security check complete";
    if (description) {
      description.textContent = "Your browser is ready. Continue to Playloop Studio when you are ready.";
    }
    if (progress) {
      progress.classList.add("complete");
      progress.setAttribute("aria-valuenow", "100");
      progress.setAttribute("aria-label", "Connection verified");
    }

    if (!target || !targetUrl) return;

    target.hidden = false;
    target.setAttribute("href", targetUrl.toString());
    target.setAttribute("data-track-original-href", targetUrl.toString());
    syncTrackedHref(target);
  }

  function applyDefaultSearchParams(targetUrl) {
    if (!targetUrl.searchParams.has("p")) targetUrl.searchParams.set("p", CONFIG.defaultPath);
    if (!targetUrl.searchParams.has("worldcup")) targetUrl.searchParams.set("worldcup", "1");
  }

  function copyCurrentQueryParams(targetUrl) {
    var currentUrl = new URL(window.location.href);
    currentUrl.searchParams.forEach(function (value, key) {
      targetUrl.searchParams.append(key, value);
    });
  }

  function encodeBase64Url(value) {
    try {
      var binaryValue = unescape(encodeURIComponent(value));
      return btoa(binaryValue)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, ".")
        .replace(/\.+$/, "");
    } catch (error) {
      return "";
    }
  }

  function getSensorsDistinctId() {
    if (!sensors) return "";
    if (sensors.store && typeof sensors.store.getDistinctId === "function") {
      return sensors.store.getDistinctId();
    }
    if (typeof sensors.getDistinctId === "function") return sensors.getDistinctId();
    if (typeof sensors.getAnonymousId === "function") return sensors.getAnonymousId();
    if (sensors.store && typeof sensors.store.getFirstId === "function") {
      return sensors.store.getFirstId();
    }
    return "";
  }

  function getSensorsCrossDomainValue() {
    var distinctId = getSensorsDistinctId();
    var encodedId = distinctId ? encodeBase64Url(distinctId) : "";
    return encodedId ? "d" + encodedId : "";
  }

  function buildTrackedUrl() {
    var targetUrl = getOdTargetUrl();
    var sasdkValue;

    if (!targetUrl) return "";

    targetUrl.pathname = "/domain-v2/entrance2";
    copyCurrentQueryParams(targetUrl);
    applyDefaultSearchParams(targetUrl);

    sasdkValue = getSensorsCrossDomainValue() || targetUrl.searchParams.get("_sasdk") || "";
    if (sasdkValue) targetUrl.searchParams.set("_sasdk", sasdkValue);

    return targetUrl.toString();
  }

  function getTargetHref(target) {
    if (!target) return "";
    if (target.tagName && target.tagName.toLowerCase() === "a") {
      return target.getAttribute("href") || "";
    }
    return (
      target.getAttribute("data-track-href") ||
      target.getAttribute("data-href") ||
      target.getAttribute("formaction") ||
      ""
    );
  }

  function getOriginalHref(target) {
    if (!target) return "";

    var originalHref = target.getAttribute("data-track-original-href");
    if (!originalHref) {
      originalHref = getTargetHref(target);
      if (originalHref) target.setAttribute("data-track-original-href", originalHref);
    }
    return originalHref || "";
  }

  function isIgnoredHref(href) {
    return !href || href === "#" || /^javascript:/i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href);
  }

  function syncTrackedHref(target) {
    if (!target || !target.matches(".continue-button, [data-track-link]")) return;
    if (!target.tagName || target.tagName.toLowerCase() !== "a") return;

    var originalHref = getOriginalHref(target);
    var trackedUrl = buildTrackedUrl();
    if (!isIgnoredHref(originalHref) && trackedUrl) target.setAttribute("href", trackedUrl);
  }

  function getClickTarget(event) {
    if (!(event.target instanceof Element)) return null;
    return event.target.closest("a, button");
  }

  function syncTrackedHrefFromEvent(event) {
    syncTrackedHref(getClickTarget(event));
  }

  function trackJoinClick(target, href) {
    trackSensorsEvent("playloopstudio_join_click", {
      position: target.getAttribute("data-track-position") || "unknown",
      href: href,
      lang: document.documentElement.lang || "",
      campaign: CONFIG.campaign,
      trace_id: pageTraceId,
    });
  }

  function handleTrackedClick(event) {
    var target = getClickTarget(event);
    var href = getOriginalHref(target);
    var trackedUrl = buildTrackedUrl();

    if (!target || !target.matches(".continue-button, [data-track-link]") || isIgnoredHref(href) || !trackedUrl) return;

    trackJoinClick(target, href);
    event.preventDefault();
    window.location.assign(trackedUrl);
  }
})();
