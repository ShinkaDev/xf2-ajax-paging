/**
 * Replace regular pagination with AJAX requests.
 *
 * @property replace       A selector and optionally a second selector the first should be replaced with.
 *                         If a second selector is not supplied, uses the first selector.
 *                         Selectors are delimited by "with".
 *                         Defaults to `.block-outer, .block-container`.
 * @property filter        Selector to filter out of replace query.
 *                         Defaults to `null`.
 * @property animate       The selector that should be slid in and out of view. If `null`, replace property
 *                         will be animated.
 *                         Defaults to `.block-body`.
 * @property disableSubmit Selectors to disable while the request is processing to prevent duplicate requests.
 *                         Defaults to `.button, :submit, :reset, [data-disable-submit], a[data-xf-click="ajax-click"]`.
 * @property hideOverlay   When replacement fails, AJAX response spawns an overlay.
 *                         Defaults to `true`.
 * @property method        Method uses for AJAX request.
 *                         Defaults to `GET`.
 * @property formData      Extra data to send in request body.
 *                         Defaults to `null`.
 */
XF.ShinkaAjaxPage = XF.Element.newHandler({
    eventNameSpace: "ShinkaAjaxPage",
    options: {
      hideOverlay: true,
      formData: null,
      method: "GET",
      disableSubmit:
        '.button, :submit, :reset, [data-disable-submit], a[data-xf-click="ajax-click"]',
  
      replace: ".block-outer, .block-container",
      filter: null,
      animate: ".block-body",
  
      page: 1,
      pager: ".pageNavWrapper a",
      nextPager: ".pageNav-jump--next",
      prevPager: ".pageNav-jump--prev",
      jumpPager: ".pageNav-page--skip a",
  
      pageJumpSubmit: ".js-pageJumpGo",
      pageJumpField: ".js-pageJumpPage",
      baseUrlAttr: "page-url",
      sentinel: "%page%"
    },
  
    selectorOld: null,
    selectorNew: null,
  
    submitPending: false,
    head: $("head"),
    $target: null,
  
    $jumpSubmit: null,
    $jump: null,
    baseUrl: null,
  
    canonical: $('link[rel="canonical"]'),
    prev: $('link[rel="prev"]'),
    next: $('link[rel="next"]'),
  
    href: null,
    page: null,
    initialState: {},
  
    init: function() {
      if (!this.validateOptions()) return;
      this.initialState = { page: this.options.page, href: window.location.href };
  
      this.splitParts();
  
      this.$jumpSubmit = $(`${this.options.pageJumpSubmit}`);
      this.$jump = $(`${this.options.pageJumpField}`);
      this.baseUrl = $(`[data-${this.options.baseUrlAttr}]`)
        .first()
        .data(this.options.baseUrlAttr);
  
      // use JQuery handler because window.onpopstate fires on initial page load
      $(window).on("popstate", $.proxy(this, "popstate"));
      $(this.options.pager).click($.proxy(this, "click"));
  
      // wrap in timeout so PageJump handler has time to attachZ
      setTimeout(() => {
        this.$jumpSubmit.off("click");
        this.$jumpSubmit.click($.proxy(this, "jump"));
      }, 100);
    },
  
    /**
     * Check that required options are not null or empty strings
     *
     * @returns {boolean}
     */
    validateOptions: function() {
      // Double bangs (!!) forces boolean
      return !!(this.options.replace && this.options.pager);
    },
  
    /**
     * Split given replace string into the selector to replace and the selector to replace with.
     */
    splitParts: function() {
      let parts = this.options.replace.split(" with ");
      this.selectorOld = $.trim(parts[0]);
      this.selectorNew = parts[1] ? $.trim(parts[1]) : this.selectorOld;
    },
  
    /**
     * Attempt to extract page information from target
     * Ideally this is set as a data attribute. If not, go through fall backs.
     */
    setPage: function() {
      let $target = this.$target;
  
      if ($target.data("page")) {
        this.page = $target.data("page");
      } else if ($target.is(this.options.nextPager)) {
        this.page++;
      } else if ($target.is(this.options.prevPager)) {
        this.page--;
      } else {
        // our last hail mary
        this.page = $.trim($target.text());
      }
    },
  
    /**
     * Build URL with the given page number, base URL,
     * and sentinel.
     */
    buildUrl: function() {
      var baseUrl = this.baseUrl,
        sentinel = this.options.sentinel,
        url = baseUrl.replace(sentinel, this.page);
  
      // fallback if sentinel is encoded in base URL
      if (url == baseUrl) {
        url = baseUrl.replace(encodeURIComponent(sentinel), this.page);
      }
  
      this.href = url;
    },
  
    /**
     * Read page input from page jump field,
     * build the URL, and make an AJAX request
     * to that location.
     */
    jump: function(e) {
      this.page = parseInt(this.$jump.val(), 10);
      if (this.page < 1) this.page = 1;
  
      this.buildUrl();
      this.updateUrl();
  
      // simulate click to close page jump overlay
      $(this.options.jumpPager).click();
  
      this.sendRequest();
    },
  
    /**
     * Compose and send an AJAX request from the given options.
     * Disable buttons until request completes or times out.
     *
     * @param e Click event
     */
    click: function(e) {
      e.preventDefault();
  
      if (!e.currentTarget.href || this.submitPending) return;
  
      this.submitPending = true;
      this.target = e.currentTarget;
      this.$target = $(e.currentTarget);
  
      this.setPage();
      this.href = this.target.href;
      this.updateUrl();
  
      this.sendRequest();
    },
  
    /**
     * Send AJAX request to the given href.
     */
    sendRequest: function() {
      let self = this;
      let event = $.Event("ajax-page:before"),
        config = {
          handler: this,
          method: self.options.method,
          action: self.href,
          successCallback: $.proxy(this, "parseResponse"),
          ajaxOptions: { skipDefault: true },
          formData: self.options.formData
        };
  
      // do this in a timeout to ensure that all other submit handlers run
      setTimeout(function() {
        self.disableButtons();
  
        XF.ajax(
          config.method,
          config.action,
          config.formData,
          config.successCallback,
          config.ajaxOptions
        ).always(function() {
          // delay re-enable slightly to allow animation to potentially happen
          setTimeout(function() {
            self.submitPending = false;
            self.enableButtons();
          }, 300);
          event = $.Event("ajax-page:always");
        });
      }, 0);
    },
  
    /**
     * Disable buttons and pagers to prevent duplicate requests.
     */
    disableButtons: function() {
      let disable = this.options.disableSubmit;
      disable && $(disable).prop("disabled", true);
    },
  
    /**
     * Re-enable buttons after request is processed.
     */
    enableButtons: function() {
      let disable = this.options.disableSubmit;
      disable && $(disable).prop("disabled", false);
    },
  
    /**
     * Handle redirection, overlays, and parsing the response HTML.
     *
     * @param data Wrapper for new HTML and overlay container
     */
    parseResponse: function(data) {
      if (typeof data !== "object") {
        XF.alert("Response was not JSON.");
        return;
      }
  
      let $target = this.$target;
  
      let event = $.Event("ajax-page:response");
      if (event.isDefaultPrevented()) {
        return;
      }
  
      let errorEvent = $.Event("ajax-page:error"),
        hasError = false,
        $overlay = $target.closest(".overlay");
  
      if (!$overlay.length || !this.options.hideOverlay) {
        $overlay = null;
      }
  
      if (data.errorHtml) {
        $target.trigger(errorEvent, data, this);
        if (!errorEvent.isDefaultPrevented()) {
          XF.setupHtmlInsert(data.errorHtml, function($html, container) {
            const title =
              container.h1 ||
              container.title ||
              XF.phrase("oops_we_ran_into_some_problems");
            XF.overlayMessage(title, $html);
          });
        }
      } else if (data.errors) {
        $target.trigger(errorEvent, data, this);
        if (!errorEvent.isDefaultPrevented()) {
          XF.alert(data.errors);
        }
      } else if (data.exception) {
        XF.alert(data.exception);
      } else if (data.html) {
        let self = this;
        XF.setupHtmlInsert(data.html, function($html, container) {
          if (self.options.replace && self.handleResponse($html, container)) {
            return false;
          }
  
          if ($overlay) {
            $overlay.trigger("overlay:hide");
          }
  
          let $childOverlay = XF.getOverlayHtml({
            html: $html,
            title: container.h1 || container.title
          });
          XF.showOverlay($childOverlay);
        });
      }
  
      event = $.Event("ajax-page:complete");
      $target.trigger(event, data, this);
      return event.isDefaultPrevented();
    },
  
    /**
     * Push new URL to history.
     */
    updateUrl: function() {
      history.pushState(
        { page: this.page, href: this.href },
        document.title,
        this.href
      );
    },
  
    /**
     * Update document title with current page and XF phrase.
     *
     * @param title Container title, e.g. subject of a thread
     */
    updateTitle: function(title) {
      document.title =
        this.page > 1
          ? title +
            XF.phrase("title_page_x", { "{page}": this.page }) +
            " | Xenforo"
          : title + " | Xenforo";
    },
  
    /**
     * Update canonicals for SEO friendliness.
     */
    updateRel: function() {
      let nextPager = $(this.options.nextPager),
        prevPager = $(this.options.prevPager);
  
      // Replace canonical
      if (this.canonical.length) {
        this.canonical[0].href = this.href;
        !this.canonical[0].parentElement && this.head.append(this.canonical[0]);
      } else {
        this.head.append(
          $("<link/>")
            .attr("rel", "canonical")
            .attr("href", this.href)
        );
      }
  
      // Replace prev
      if (prevPager.length) {
        if (this.prev.length) {
          this.prev[0].href = prevPager[0].href;
          !this.prev[0].parentElement && this.head.append(this.prev[0]);
        } else {
          this.prev = $("<link/>")
            .attr("rel", "prev")
            .attr("href", prevPager[0].href);
          this.head.append(this.prev);
        }
      } else {
        this.prev.detach();
      }
  
      // Replace next
      if (nextPager.length) {
        if (this.next.length) {
          this.next[0].href = nextPager[0].href;
          !this.next[0].parentElement && this.head.append(this.next[0]);
        } else {
          this.next = $("<link/>")
            .attr("rel", "prev")
            .attr("href", nextPager[0].href);
          this.head.append(this.next);
        }
      } else {
        this.next.detach();
      }
    },
  
    /**
     * Handler for backward and forward navigation.
     *
     * @param event
     */
    popstate: function(event) {
      let state = event.originalEvent.state || this.initialState;
  
      this.href = state.href;
      this.page = state.page;
  
      this.sendRequest();
    },
  
    /**
     * Update document title.
     * Find and replace the old selector with the new selector from the response HTML.
     * Animate children if option is provided; otherwise animate entire element.
     *
     * @param $html New content
     * @param container Overlay container
     * @returns {boolean}
     */
    handleResponse: function($html, container) {
      this.updateTitle(container.title);
  
      let replace = this.options.replace;
      if (!replace) {
        return false;
      }
  
      let selectorOld = this.selectorOld;
      let selectorNew = this.selectorNew;
  
      if (selectorOld === "self" || this.$target.is(selectorOld)) {
        $old = this.$target;
      } else {
        $old = $(selectorOld);
      }
  
      if (!$old.length) {
        console.error(`Could not find old selector '${selectorOld}'`);
        return false;
      }
  
      // insert only elements that match the given selector
      // mostly for paging discussions
      $html = this.options.filter ? $html.filter(this.options.filter) : $html;
      $filtered = $html.filter(selectorNew);
      $new = $filtered.length ? $filtered : $html.find(selectorNew);
  
      if (!$new.length) {
        console.error(`Could not find new selector '${selectorNew}'`);
        return false;
      }
  
      let $animateIn, $animateOut;
      if (this.options.animate) {
        $animateIn = $new.find(this.options.animate);
        $animateOut = $old.find(this.options.animate);
  
        if (!$animateIn.length) {
          $animateIn = $new.filter(this.options.animate);
        }
  
        if (!$animateOut.length) {
          $animateOut = $old.filter(this.options.animate);
        }
      } else {
        $animateIn = $new;
        $animateOut = $old;
      }
  
      // remove transitions so slide in and slide out animate properly
      // mostly for paging discussions (again)
      $animateIn.css("transition", "none");
      $animateOut.css("transition", "none");
  
      $new.hide();
  
      let self = this;
      $animateOut.xfFadeUp(null, function() {
        $new.insertAfter($old.first());
        $new = self.options.animate
          ? $new.filter(`:not(${self.options.animate})`)
          : $new;
        $old.remove();
        self.replaceInlineModBar();
  
        if ($new.length) {
          XF.activate($new);
          $(self.options.pager).click($.proxy(self, "click"));
          self.$jumpSubmit = $(self.options.pageJumpSubmit);
          setTimeout(() => {
            self.$jumpSubmit.off("click");
            self.$jumpSubmit.click($.proxy(self, "jump"));
          }, 100);
  
          $animateIn.hide();
          $new.show();
          $animateIn.xfFadeDown(null, XF.layoutChange);
  
          self.updateRel();
        }
      });
  
      return true;
    },
  
    /**
     * Replace inline mod bar.
     *
     * New inline mod button will spawn a unique mod bar, so remove the old bar and simulate a click.
     */
    replaceInlineModBar: function() {
      $inlineModBar = $(".inlineModBar ");
      if ($inlineModBar.length) {
        $inlineModBar.css("opacity", 0);
        // allow time for CSS transition
        setTimeout(function() {
          $inlineModBar.remove();
          $(".js-inlineModTrigger").click();
        }, 100);
      }
    }
  });
  
  XF.Element.register("ajax-page", "XF.ShinkaAjaxPage");
  