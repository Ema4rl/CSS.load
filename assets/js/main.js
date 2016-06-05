(function (win) {
    const _only = {
        pre_code: 'pre>code',
        base_path: win.location.hostname === 'localhost' ? '/projects/CSS.load/gh-pages/assets/' : '/CSS.load/assets/',
        toc: '#toc'
    };
    var doc = win.document;

    $O.setDefaults({
        basePath: _only.base_path
    });
    $O.js('js/CSS.load.min.js'); // load CSS.load to handle rel=preload hack and CSS loading

    $O.ready(function () {
        $O.test(_only.pre_code).js('js/highlight.pack.js')
            .wait(function(){
                hljs.configure({tabReplace: true});
                Array.prototype.forEach.call(doc.querySelectorAll(_only.pre_code), function(i) {
                    hljs.highlightBlock(i);
                });
            });
        $O.test(_only.toc).js('js/toc.min.js')
            .wait(function(){
                doc.querySelector(_only.toc).appendChild(initTOC({
                    // headers selector
                    selector:'h2',
                    // selector to specify elements search scope
                    scope:'section',
                    // whether to overwrite existed headers' id
                    overwrite:false,
                    // string to prepend to id/href property
                    prefix:'toc'
                }));
            });
    });
})(window);
