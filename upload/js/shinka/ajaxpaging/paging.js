/**
 * Submits an AJAX request with the given data attributes.
 * Most of code is pigeoned from XF.AjaxSubmit.
 */
XF.ShinkaAjaxPagingClick = XF.Click.newHandler({
    eventNameSpace: 'XFShinkaAjaxPagingClick',

    options: {
        redirect: true,
        skipOverlayRedirect: false,
        forceFlashMessage: false,
        hideOverlay: true,
        replace: null,
        formData: null,
        method: "get",
        action: null,
        disableSubmit: '.button, :submit, :reset, [data-disable-submit]'
    },

    init: function()
    {
    },

    click: function(e)
    {
        e.preventDefault();

        var self = this;

        var event = $.Event('ajax-click:before'),
            config = {
                handler: this,
                method: self.options.method,
                action: self.options.action,
                successCallback: $.proxy(this, 'submitResponse'),
                ajaxOptions: { skipDefault: true },
                formData: self.options.formData
            };

        // do this in a timeout to ensure that all other submit handlers run
        setTimeout(function()
        {
            XF.ajax(
                config.method,
                config.action,
                config.formData,
                config.successCallback,
                config.ajaxOptions
            ).always(function()
            {
                event = $.Event('ajax-click:always');
            });
        }, 0);
    },

    disableButtons: function()
    {
        var disable = this.options.disableSubmit;
        if (!disable)
        {
            return;
        }

        $(disable).prop('disabled', true);
    },

    enableButtons: function()
    {
        var disable = this.options.disableSubmit;
        if (!disable)
        {
            return;
        }

        $(disable).prop('disabled', false);
    },

    submitResponse: function(data, status, xhr)
    {
        if (typeof data != 'object')
        {
            XF.alert('Response was not JSON.');
            return;
        }

        console.log(data, status, xhr);

        var $target = this.$target;
        var self = this;

        var event = $.Event('ajax-click:response');
        $target.trigger(event, data, this);
        if (event.isDefaultPrevented())
        {
            return;
        }

        var errorEvent = $.Event('ajax-click:error'),
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

        if (self.options.redirect)
        {
            doRedirect = self.options.redirect;
        }

        if (data.errorHtml)
        {
            $target.trigger(errorEvent, data, this);
            if (!errorEvent.isDefaultPrevented())
            {
                XF.setupHtmlInsert(data.errorHtml, function($html, container)
                {
                    var title = container.h1 || container.title || XF.phrase('oops_we_ran_into_some_problems');
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
        else if (data.status == 'ok' && data.message)
        {
            if (doRedirect)
            {
                if (this.options.forceFlashMessage)
                {
                    XF.flashMessage(data.message, 1000, function()
                    {
                        XF.redirect(data.redirect);
                    });
                }
                else
                {
                    XF.redirect(data.redirect);
                }
            }
            else
            {
                XF.flashMessage(data.message, 3000);
            }

            if ($overlay)
            {
                $overlay.trigger('overlay:hide');
            }
        }
        else if (data.html)
        {
            XF.setupHtmlInsert(data.html, function($html, container, onComplete)
            {
                if (self.options.replace && self.doSubmitReplace($html, onComplete))
                {
                    return false; // handle on complete when finished
                }

                if ($overlay)
                {
                    $overlay.trigger('overlay:hide');
                }

                var $childOverlay = XF.getOverlayHtml({
                    html: $html,
                    title: container.h1 || container.title
                });
                XF.showOverlay($childOverlay);
            });
        }
        else if (data.status == 'ok')
        {
            if (doRedirect)
            {
                XF.redirect(data.redirect);
            }

            if ($overlay)
            {
                $overlay.trigger('overlay:hide');
            }
        }

        event = $.Event('ajax-click:complete');
        $target.trigger(event, data, this);
        if (event.isDefaultPrevented())
        {
            return;
        }
    },

    doSubmitReplace: function($html, onComplete)
    {
        var replace = this.options.replace;

        if (!replace)
        {
            return false;
        }

        var parts = replace.split(' with '),
            selectorOld = $.trim(parts[0]),
            selectorNew = parts[1] ? $.trim(parts[1]) : selectorOld,
            $old, $new;

        if (selectorOld == 'self' || this.$target.is(selectorOld))
        {
            $old = this.$target;
        }
        else
        {
            $old = this.$target.find(selectorOld).first();
            if (!$old.length)
            {
                $old = $(selectorOld).first();
            }
        }

        if (!$old.length)
        {
            console.error("Could not find old selector '" + selectorOld + "'");
            return false;
        }

        if ($html.is(selectorNew))
        {
            $new = $html;
        }
        else
        {
            $new = $html.find(selectorNew).first();
        }

        if (!$new.length)
        {
            console.error("Could not find new selector '" + selectorNew + "'");
            return false;
        }

        $new.hide().insertAfter($old);
        $old.xfFadeUp(null, function()
        {
            $old.remove();

            if ($new.length)
            {
                XF.activate($new);
                onComplete(false);
            }

            $new.xfFadeDown(null, XF.layoutChange);
        });

        return true;
    }
});

XF.Click.register('ajax-click', 'XF.ShinkaAjaxPagingClick');