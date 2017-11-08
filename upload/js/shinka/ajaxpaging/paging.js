/**
 * Submits an AJAX request with the given attributes.
 * Most of code is pigeoned from XF.AjaxSubmit.
 *
 * @property replace       A selector and optionally a second selector the first should be replaced with.
 *                         Selectors are delimited by "with".
 *                         Defaults to `.block with .block`.
 * @property animate       The selector that should be slid in and out of view. If `null`, replace will be animated.
 *                         Defaults to `.block-body`.
 * @property disableSubmit Selectors to disable while the request is processing to prevent duplicate requests.
 *                         Defaults to `.button, :submit, :reset, [data-disable-submit], a[data-xf-click="ajax-click"]`.
 */
XF.ShinkaAjaxPage = XF.Element.newHandler({
    
        eventNameSpace: 'ShinkaAjaxPage',
        options: {
            redirect: true,
            skipOverlayRedirect: false,
            forceFlashMessage: false,
            hideOverlay: true,
            formData: null,
            method: 'get',
            disableSubmit: '.button, :submit, :reset, [data-disable-submit], a[data-xf-click="ajax-click"]',
    
            replace: '.block',
            animate: '.block-body',
    
            pager: '.pageNavWrapper a',
            nextPager: '.pageNav-jump--next',
            prevPager: '.pageNav-jump--prev'
        },
    
        selectorOld: null,
        selectorNew: null,
    
        submitPending: false,
        href: null,
        head: $('head'),
        $target: null,
    
        canonical: $('link[rel="canonical"]'),
        prev: $('link[rel="prev"]'),
        next: $('link[rel="next"]'),
    
        page: null,
    
        init: function()
        {
            if (!this.validateOptions()) return;
    
            this.splitParts();
    
            // Push initial state
            history.pushState({html: $(this.selectorNew)[0].outerHTML, title: document.title},
                document.title,
                window.location.href);
    
            $(window).on('popstate', $.proxy(this, 'popstate'));
            $(this.options.pager).click($.proxy(this, 'click'))
        },
    
        /**
         * Check that required options are not null or empty strings
         *
         * @returns {boolean}
         */
        validateOptions: function()
        {
            // Double bangs (!!) forces boolean
            return (!!(this.options.replace && this.options.pager));
        },
    
        /**
         * Assigns selectors for the elements to replace and replacing
         */
        splitParts: function()
        {
            let parts = this.options.replace.split(' with ');
            this.selectorOld = $.trim(parts[0]);
            this.selectorNew = parts[1] ? $.trim(parts[1]) : this.selectorOld
        },
    
        /**
         * Attempt to extract page information from target
         * Ideally this is set as a data attribute. If not, go through fall backs.
         *
         * @param e Click event
         */
        setPage: function()
        {
            let $target = this.$target;
    
            if ($target.data('page'))
            {
                this.page = $target.data('page');
            }
            else if ($target.is(this.options.nextPager))
            {
                this.page++;
            }
            else if ($target.is(this.options.prevPager))
            {
                this.page--;
            }
            else
            {
                // our last hail mary
                this.page = $.trim($target.text());
            }
        },
    
        /**
         * Composes and sends an AJAX request from the given options
         * Disables buttons until request completes or times out
         *
         * @param e Click event
         */
        click: function(e)
        {
            e.preventDefault();
    
            if (!e.currentTarget.href || this.submitPending) return;
    
            this.submitPending = true;
            this.target = e.currentTarget;
            this.$target = $(e.currentTarget);
    
            this.setPage();
            this.href = this.target.href;
    
            let self = this;
            let event = $.Event('ajax-page:before'),
                config = {
                    handler: this,
                    method: self.options.method,
                    action: self.href,
                    successCallback: $.proxy(this, 'submitResponse'),
                    ajaxOptions: { skipDefault: true },
                    formData: self.options.formData
                };
    
            // do this in a timeout to ensure that all other submit handlers run
            setTimeout(function()
            {
                self.disableButtons();
    
                XF.ajax(
                    config.method,
                    config.action,
                    config.formData,
                    config.successCallback,
                    config.ajaxOptions
                ).always(function()
                {
                    // delay re-enable slightly to allow animation to potentially happen
                    setTimeout(function()
                    {
                        self.submitPending = false;
                        self.enableButtons();
                    }, 300);
                    event = $.Event('ajax-page:always');
                });
            }, 0);
        },
    
        disableButtons: function()
        {
            let disable = this.options.disableSubmit;
            disable && $(disable).prop('disabled', true);
        },
    
        enableButtons: function()
        {
            let disable = this.options.disableSubmit;
            disable && $(disable).prop('disabled', false);
        },
    
        /**
         * Handles redirection, overlays, and parsing the response HTML
         *
         * @param data
         * @param status
         * @param xhr
         */
        submitResponse: function(data, status, xhr)
        {
            if (typeof data !== 'object')
            {
                XF.alert('Response was not JSON.');
                return;
            }
    
            let $target = this.$target;
    
            let event = $.Event('ajax-page:response');
            if (event.isDefaultPrevented())
            {
                return;
            }
    
            let errorEvent = $.Event('ajax-page:error'),
                hasError = false,
                doRedirect = data.redirect && this.options.redirect,
                $overlay = $target.closest('.overlay');
    
            if (!$overlay.length || !this.options.hideOverlay)
            {
                $overlay = null;
            }
    
            if (doRedirect && this.options.skipOverlayRedirect && $overlay)
            {
                doRedirect = false;
            }
    
            if (this.options.redirect)
            {
                doRedirect = this.options.redirect;
            }
    
            if (data.errorHtml)
            {
                $target.trigger(errorEvent, data, this);
                if (!errorEvent.isDefaultPrevented())
                {
                    XF.setupHtmlInsert(data.errorHtml, function($html, container)
                    {
                        const title = container.h1 || container.title || XF.phrase('oops_we_ran_into_some_problems');
                        XF.overlayMessage(title, $html);
                    });
                }
    
                hasError = true;
            }
            else if (data.errors)
            {
                $target.trigger(errorEvent, data, this);
                if (!errorEvent.isDefaultPrevented())
                {
                    XF.alert(data.errors);
                }
    
                hasError = true;
            }
            else if (data.exception)
            {
                XF.alert(data.exception);
            }
            else if (data.html)
            {
                let self = this;
                XF.setupHtmlInsert(data.html, function ($html, container, onComplete) {
                    if (self.options.replace && self.doSubmitReplace($html, onComplete)) {
                        self.updateUrl($html, container);
                        return false;
                    }
    
                    if ($overlay) {
                        $overlay.trigger('overlay:hide');
                    }
    
                    let $childOverlay = XF.getOverlayHtml({
                        html: $html,
                        title: container.h1 || container.title
                    });
                    XF.showOverlay($childOverlay);
                });
            }
    
            event = $.Event('ajax-page:complete');
            $target.trigger(event, data, this);
            return event.isDefaultPrevented();
        },
    
        /**
         * Pushes new URL to history
         *
         * @param $html
         * @param container
         */
        updateUrl: function($html, container)
        {
            document.title = this.page > 1 ?
                container.title + XF.phrase('title_page_x', {'{page}': this.page}) + ' | Xenforo' :
                container.title + ' | Xenforo';
            history.pushState({html: $html.filter(this.selectorNew)[0].outerHTML, title: document.title},
                document.title,
                this.href);
        },
    
        /**
         * Updates canonicals for SEO friendliness
         */
        updateRel: function()
        {
            let nextPager = $(this.options.nextPager),
                prevPager = $(this.options.prevPager);
    
            if (this.canonical.length)
            {
                this.canonical[0].href = this.href;
                !this.canonical[0].parentElement && this.head.append(this.canonical[0]);
            }
            else
            {
                this.head.append($('<link/>')
                    .attr('rel', 'canonical')
                    .attr('href', this.href));
            }
    
            if (prevPager.length)
            {
                if (this.prev.length)
                {
                    this.prev[0].href = prevPager[0].href;
                    !this.prev[0].parentElement && this.head.append(this.prev[0]);
                }
                else
                {
                    this.prev = $('<link/>')
                        .attr('rel', 'prev')
                        .attr('href', prevPager[0].href);
                    this.head.append(this.prev);
                }
            }
            else {
                this.prev.detach();
            }
    
            if (nextPager.length)
            {
                if (this.next.length)
                {
                    this.next[0].href = nextPager[0].href;
                    !this.next[0].parentElement && this.head.append(this.next[0]);
                }
                else
                {
                    this.next = $('<link/>')
                        .attr('rel', 'prev')
                        .attr('href', nextPager[0].href);
                    this.head.append(this.next);
                }
            }
            else {
                this.next.detach();
            }
        },
    
        /**
         * Handler for backward and forward navigation
         *
         * @param event
         */
        popstate: function(event)
        {
            let state = event.originalEvent.state;
            if (state === null) return;
    
            document.title = state.title;
            this.doSubmitReplace($(state.html));
        },
    
        /**
         * Finds and replaces the old selector with the new selector from the response HTML.
         * Animates children if option is provided; otherwise animates entire element.
         *
         * @param $html
         * @param onComplete
         * @returns {boolean}
         */
        doSubmitReplace: function($html, onComplete)
        {
            let replace = this.options.replace;
    
            if (!replace)
            {
                return false;
            }
    
            let selectorOld = this.selectorOld;
            let selectorNew = this.selectorNew;
    
            if (selectorOld === 'self' || this.$target.is(selectorOld))
            {
                $old = this.$target;
            }
            else
            {
                $old = $(selectorOld).first();
            }
    
            if (!$old.length)
            {
                console.error("Could not find old selector '" + selectorOld + "'");
                return false;
            }
    
            // insert only elements that match the given selector
            // mostly for paging discussions
            $filtered = $html.filter(selectorNew);
            $new = $filtered.length ? $filtered : $html.find(selectorNew).first();
    
            if (!$new.length)
            {
                console.error("Could not find new selector '" + selectorNew + "'");
                return false;
            }
    
            $new.hide();
    
            let $animateIn, $animateOut;
            if (this.options.animate)
            {
                $animateIn = $new.find(this.options.animate);
                $animateOut = $old.find(this.options.animate);
    
                $animateIn = $animateIn.length ? $animateIn : $new;
                $animateOut = $animateOut.length ? $animateOut : $old;
            }
            else
            {
                $animateIn = $new;
                $animateOut = $old;
            }
    
            // remove transitions so slide in and slide out animate properly
            // mostly for paging discussions (again)
            $animateIn.css('transition', 'none');
            $animateOut.css('transition', 'none');
    
            let self = this;
            $animateOut.xfFadeUp(null, function()
            {
                $old.replaceWith($new);
                self.replaceInlineModBar();
    
                if ($new.length)
                {
                    XF.activate($new);
                    $animateIn.hide();
                    $new.show();
                    $animateIn.xfFadeDown(null, XF.layoutChange);
                }
    
                self.updateRel();
            });
    
            return true;
        },
    
        /**
         * Replace inline mod bar
         *
         * New inline mod button will spawn a unique mod bar, so remove the old bar and simulate a click.
         */
        replaceInlineModBar: function()
        {
            $inlineModBar = $('.inlineModBar ');
            if ($inlineModBar.length)
            {
                $inlineModBar.css('opacity', 0);
                // allow time for CSS transition
                setTimeout(function()
                {
                    $inlineModBar.remove();
                    $('.js-inlineModTrigger').click();
                }, 100);
            }
        }
    });
    
    XF.Element.register('ajax-page', 'XF.ShinkaAjaxPage');