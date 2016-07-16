var gulp = require('gulp');
var browserify = require('browserify');
var concat = require('gulp-concat');
var riotify = require('riotify');
var source = require('vinyl-source-stream');

gulp.task('browserify', function () {
    return browserify({
        debug: true,
        // this is an array of all entry points
        // where Browserify starts to look for
        // dependencies
        entries: ['./scripts/main.js'],
        // list of transforms that are supported
        // riotify needs .tag file name extension
        // to support tag compilation
        transform: [riotify]
    }).bundle()
    // take the end result and place it to dist folder
    .pipe(source('main.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('css', function() {
  return gulp.src('./tags/*.css')
    .pipe(concat('main.css'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['browserify', 'css']);