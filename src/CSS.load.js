/*! loadCSS: load a CSS file asynchronously. [c]2016 @scottjehl, Filament Group, Inc. Licensed MIT */
(function(w) {
	"use strict";

    // cache current $CSS - used to rollback $CSS in noConflict()
    var _$CSS = w.$CSS,
        d = w.document,
        head = d.head || d.getElementsByTagName("head")[0],
        root_page = /^[^?#]*\//.exec(location.href)[0],
        root_domain = /^[\w|\-]+:\/\/\/?[^\/]+/.exec(root_page)[0],
        loaded_stylesheets = [];

    // test for function
    function is_func(func) { return Object.prototype.toString.call(func) == "[object Function]"; }

    // test for array
    function is_array(arr) { return Object.prototype.toString.call(arr) == "[object Array]"; }

    // test for method
    function is_method(meth) { return typeof meth !== 'undefined'; }

    // make css URL absolute/canonical
    function canonical_uri(href, base_path) {
        var absolute_regex = /^\w+:\/\//;

        // is `href` is protocol-relative (begins with // or ///), prepend protocol
        if (/^\/\/\/?/.test(href))
            href = location.protocol + href;

        // is `href` page-relative? (not an absolute URL, and not a domain-relative path, beginning with /)
        else if (!absolute_regex.test(href) && href.charAt(0) != "/")
            href = (base_path || "") + href; // prepend `base_path`, if any

        // make sure to return `href` as absolute
        return absolute_regex.test(href) ? href : ((href.charAt(0) == "/" ? root_domain : root_page) + href);
    }

    // merge `source` into `target`
    function merge_objs(source,target) {
        for (var k in source)
            if (source.hasOwnProperty(k))
                target[k] = source[k]; // TODO: does this need to be recursive for our purposes?

        return target;
    }

    function create_instance() {
        var promise,
            global_defaults = {
                insertAtElement: null,
                insertBefore: false,
                basePath: "",
                allowDuplicates: false,
                cacheBust: false
            }
            ;

        // $CSS().load().callback()

        function create_chain() {
            var chain_opts = merge_objs(global_defaults,{}),
                initialPromise,
                chainedPromise,
                resolutions = [],
                rejections = [],
                always = [],
                ss_objs = [],
                ss_obj,
                resolved = false,
                rejected = false;

            function resolve(ss, media) {
                resolved = true;
                ss.media = media; // set link's media back to `all` so that the stylesheet applies
                for ( var i=0, len=resolutions.length; i<len; i++ ) resolutions[i](ss);
                for ( var ai=0, a_len=always.length; i<a_len; i++ ) always[ai](ss); // run always on success

                // empty vars
                //resolutions = [];
                //always = [];
            }

            function reject(ss) {
                rejected = true;
                for ( var i=0, len=rejections.length; i<len; i++ ) rejections[i](ss);
                for ( var ai=0, a_len=always.length; i<a_len; i++ ) always[ai](ss); // run always on success

                // empty vars
                //rejections = [];
                //always = [];
            }

            /*
             * attributes - contains the URL & other attributes for your CSS file
             * insertAtElement - is the element the css should use as a reference for injecting our stylesheet
             * NOTE: By default, JS.load attempts to inject the link before/after  the last stylesheet or element in the head.
             * insertBefore - boolean indicating if the stylesheet should be inserted before or after the element
             *
             */
            function request_css(attributes, insertAtElement, insertBefore, base_path) {
                var ss = d.createElement('link'),
                    key;

                // set insertAtElement. uses meta if nothing as there should be a meta element at the very top of the HEAD
                insertAtElement = d.querySelector(insertAtElement) || d.querySelector('meta');

                // re-write href before adding attribute. would rewrite URIs ignoring basePath
                attributes['data-href'] = attributes.href;
                attributes.href = canonical_uri(attributes.href, base_path) +
                    (chain_opts.cacheBust ? ((/\?.*$/.test(attributes.href) ? "&_" : "?_") + ~~(Math.random()*1E9) + "=") : "");

                // check if requested css was previously loaded !!! before setting attributes
                if (!chain_opts.allowDuplicates) {
                    var len = loaded_stylesheets.length;
                    while ( len-- )
                        if (attributes.href === loaded_stylesheets[len]) return false;
                }
                loaded_stylesheets.push(attributes.href);

                if (typeof attributes === "object")
                    for (key in attributes)
                        if (attributes.hasOwnProperty(key))
                            ss.setAttribute(key, attributes[key]); // probably safer than: ss[key] = attributes[key];

                // explicitly set rel to avoid overrides
                ss.rel = "stylesheet";

                // temporarily set media to something inapplicable to ensure it'll fetch without blocking render
                ss.media = "none";

                // Inject link
                // Note: `insertBefore` is used instead of `appendChild`, for safety re: http://www.paulirish.com/2011/surefire-dom-element-insertion/
                insertAtElement.parentNode.insertBefore(ss, insertBefore ? insertAtElement : insertAtElement.nextSibling);
                // TODO: write about expected reverse behavior with insertAfter on multiple stylesheets

                return ss;
            }

            // A method that mimics onload by polling d.styleSheets until it includes the new sheet
            function run_callback(ss_obj, media) {
                // got some ideas @ http://www.phpied.com/when-is-a-stylesheet-really-loaded/
                // and from https://gist.github.com/pete-otaqui/3912307
                var counter = 0,
                    max_attempts = 20,
                    initialSheetsLength = d.styleSheets.length;

                if (is_method(ss_obj.addEventListener)) {
                    ss_obj.addEventListener('load', resolve.bind(w, ss_obj, media), false);
                    ss_obj.addEventListener('error', reject.bind(w, ss_obj), false);
                }
                // IE 8 gives us onload for both success and failure
                // and also readyState is always "completed", even
                // for failure.  The only way to see if a stylesheet
                // load failed from an external domain is to try and
                // access its cssText, and then catch the error
                // ... already implemented by poll() but using onload to catch the event to poll once! :)
                else if (is_method(ss_obj.attachEvent))
                    ss_obj.attachEvent('onload', poll);
                // poll instead
                else
                    poll();

                function poll() {
                    // TODO: check if d.styleSheets is available cross-browser
                    var intervalId = setInterval(function() {
                            var sheets = d.styleSheets,
                                i = sheets.length,
                                txt;

                            if (i > initialSheetsLength) {
                                try {
                                    // using backwards while to quickly get the href & for speed
                                    while ( i-- ) {
                                        if (sheets[i].href === ss_obj.href) {
                                            clearInterval(intervalId);
                                            txt = sheets[i].cssText;
                                            resolve(ss_obj, media);
                                            return;
                                        }
                                    }
                                } catch(e) {}
                                if ( !resolved )
                                    reject(ss_obj);
                            }

                            // increment counter and check against max_attempts
                            if (counter++ >= max_attempts) {
                                clearInterval(intervalId);
                                // run error fn()
                                if ( !resolved )
                                    reject(ss_obj);
                            }
                        }, 500);
                }
            }

            // API for $CSS chains
            initialPromise = {
                // start loading one or more css
                load:function(){
                    (function(args){
                        for (var i=0; i<args.length; i++) {
                            var splice_args,
                                css_list = args[i],
                                css_obj;

                            if (!is_array(css_list)) css_list = [css_list];

                            for (var j= 0, len = css_list.length; j<len; j++) {
                                css_obj = css_list[j];

                                if (is_func(css_obj)) css_obj = css_obj();
                                if (!css_obj) continue;

                                // if still an array, run splice it and run first index
                                if (is_array(css_obj)) {
                                    // set up an array of arguments to pass to splice()
                                    splice_args = [].slice.call(css_obj); // first include the actual array elements we want to splice in
                                    splice_args.unshift(j,1); // next, put the `index` and `howMany` parameters onto the beginning of the splice-arguments array
                                    [].splice.apply(css_list,splice_args); // use the splice-arguments array as arguments for splice()
                                    j--; // adjust `j` to account for the loop's subsequent `j++`, so that the next loop iteration uses the same `j` index value
                                    continue;
                                }
                                if (typeof css_obj == "string") css_obj = {href: css_obj};
                                css_obj = merge_objs(css_obj, {
                                    media: "all"
                                });

                                ss_obj = request_css(css_obj, chain_opts.insertAtElement, chain_opts.insertBefore, chain_opts.basePath);

                                // skip if no object was returned
                                if (!ss_obj) continue;

                                ss_objs.push(ss_obj);

                                run_callback(ss_obj, css_obj.media);
                            }
                        }
                    })(arguments);

                    return chainedPromise;
                },
                // rollback `[w].$CSS` to what it was before this file was loaded, then return this current instance of $CSS
                noConflict:function(){
                    w.$CSS = _$CSS;

                    return promise.setOptions;
                }
            };

            // API for $CSS chains
            chainedPromise = {
                // execute done callback and return chain
                done: function(callback) {
                    resolutions.push(callback);
                    if (resolved) callback(ss_objs[ss_objs.length-1]);

                    return chainedPromise;
                },
                // execute fail callback and return chain.
                fail: function(callback) {
                    rejections.push(callback);
                    if (rejected) callback(ss_objs[ss_objs.length-1]);

                    return chainedPromise;
                },
                // execute always callback and return chain.
                always: function(callback) {
                    always.push(callback);
                    if (resolved || rejected) callback(ss_objs[ss_objs.length-1]);

                    return chainedPromise;
                }
            };

            return {
                setOptions:function(opts){
                    chain_opts = merge_objs(opts, chain_opts);

                    return initialPromise;
                }
            };
        }

        // API for each initial $CSS instance (before chaining starts)
        promise = {
            // main API functions
            setOptions:function(){
                return create_chain().setOptions.apply(null, arguments);
            }
        };

        return promise;
    }

    // create the main instance of $CSS()
    w.$CSS = create_instance().setOptions;

    // TODO: rel=preload support test
    // see: https://github.com/w3c/preload/issues/7#issuecomment-205161420

    // loop preload links and fetch using loadCSS
    // would have been cached if the browser supports preload
    (function (links) {
        for(var i = 0, len = links.length; i < len; i++) {
            var href = links[i].getAttribute('href'),
                insertAtElement = 'link[href="'+href+'"]';

            w.$CSS({
                insertAtElement: insertAtElement
            }).load(href).always(function (insertAtElement) {
                head.removeChild(head.querySelector(insertAtElement));
            }.bind(w, insertAtElement));
        }
    }(head.querySelectorAll('link[rel=preload][as="style"]')));

}(typeof global !== "undefined" ? global : (typeof exports !== "undefined" ? exports : this))); // commonjs
// TODO: automatically remove rel[preload] css
