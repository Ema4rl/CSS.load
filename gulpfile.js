// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var gzipSize = require('gzip-size');
var pretty = require('prettysize');
var map = require('vinyl-map');
var licenseRegexp = /@preserve|@cc_on|\bMIT\b|\bMPL\b|\bGPL\b|\bBSD\b|\bISCL\b|\(c\)|License|Copyright/mi;

// Lint Task
gulp.task('lint', function() {
    return gulp.src('src/CSS.load.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Concatenate & Minify JS
gulp.task('dist', function() {
    return gulp.src('src/CSS.load.js')
        .pipe(uglify({mangle: false, compress: false, output: { beautify: true }, preserveComments: function (node, comment) {
            if (licenseRegexp.test(comment.value)) {
                return true;
            }
        }}))
        .pipe(rename({basename: "CSS.load"}))
        .pipe(gulp.dest('dist'))
        .pipe(map(function(code, filename) {
            // file contents are handed over as buffers
            var string = code.toString();
            console.log(filename + ':');
            console.log('Original size (CSS.load.js): ', pretty(string.length));
            console.log('Gzipped size (CSS.load.js): ', pretty(gzipSize.sync(string)));
            return code;
        }))
        .pipe(uglify({compress: {hoist_funs: false, hoist_vars: false}}))
        .pipe(rename({basename: "CSS.load", suffix: ".min"}))
        .pipe(gulp.dest('dist'))
        .pipe(map(function(code, filename) {
            // file contents are handed over as buffers
            var string = code.toString();
            console.log(filename + ':');
            console.log('Original size (CSS.load.min.js): ', pretty(string.length));
            console.log('Gzipped size (CSS.load.min.js): ', pretty(gzipSize.sync(string)));
            return code;
        }));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch('src/*.js', ['lint', 'dist']);
});

// Default Task
gulp.task('default', ['lint', 'dist', 'watch']);
