(function (win) {
    var doc = win.document,
        l = win.location;

    const _only = {
        pre_code: 'pre>code',
        base_path: l.hostname === 'localhost' ? '/projects/CSS.load/gh-pages/assets/' : '/CSS.load/assets/',
        toc: '#toc'
    };

    $O.setDefaults({
        basePath: _only.base_path + 'js/'
    });
    $O.js('CSS.load.min.js'); // load CSS.load to handle rel=preload hack and CSS loading

    $O.ready(function () {
        $O.test(_only.pre_code).js('highlight.pack.js')
            .wait(function(){
                hljs.configure({tabReplace: true});
                Array.prototype.forEach.call(doc.querySelectorAll(_only.pre_code), function(i) {
                    hljs.highlightBlock(i);
                });
            });
        $O.test(_only.toc).js('toc.min.js')
            .wait(function(){
                doc.querySelector(_only.toc).appendChild(initTOC({
                    selector:'h2',
                    scope:'section',
                    overwrite:false,
                    prefix:'toc'
                }));
            });
    });

    // init after window has loaded
    win.onload = function () {
        // run in production only!
        if (l.hostname !== 'localhost') {
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(win,doc,'script','https://www.google-analytics.com/analytics.js','ga');

            ga('create', 'UA-49045270-6', 'auto');
            ga('send', 'pageview');
        }
    }
})(window);
