"use strict";
var gulp = require('gulp');
var rename = require("gulp-rename");
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var stylish = require('jshint-stylish');
var fileinclude = require('gulp-file-include');
var util = require('util');
var karma = require('karma').server;
var header = require('gulp-header');
var source = require('vinyl-source-stream');
var browserify = require('browserify');

var pkg = require('./package.json');


///
/// static code analysis
///
gulp.task('lint', function(){

    var sourcefiles = [
        './src/CrmFetchKit.js',
        './test/spec/*.js',
        './test/helpers/*.js',
        '!./test/helpers/*.min.js',
        '!./test/helpers/CrmRestKit*.js'
        /*, './js/*.js'*/];

    return gulp.src( sourcefiles )
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter( stylish ));
});

///
/// performs the minify operation for the test-script files
///
gulp.task('compress-helpers', function() {

    // exclude the *.min.js files
    var sourcefiles = [
        './test/helpers/*.js',
        '!./test/helpers/*.min.js'];

    return gulp.src(sourcefiles)
        .pipe(uglify())
        .pipe( rename({suffix: '.min'}))
        .pipe(gulp.dest('./test/helpers/'));
});

///
/// applies the minifcations
///
gulp.task('compress', ['browserify','compress-helpers'], function() {

    var banner = [
        '// <%= name %>.js <%= version %>',
        '// <%= homepage %>',
        '// <%= author %> \n',
        ].join('\n');

    return gulp.src('build/CrmFetchKit.bundle.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe( header(banner, pkg))
        .pipe(gulp.dest('./build') );
});

///
/// generates the testrunner html for the integration tests
///
gulp.task('build-integrationtest', function() {

    return gulp.src(['./test/SpecRunner.tmpl'])
        .pipe(fileinclude( {
            context: { name: 'integration' }
        }))
        .pipe(replace('{{version}}', pkg.version))
        .pipe(rename("SpecRunnerIntegration.html"))
        .pipe(gulp.dest('./test'));
});

// using vinyl-source-strea to browserify the module
gulp.task('browserify', function() {

    return browserify('./src/CrmFetchKit.js')
        .bundle()
        .pipe(source('CrmFetchKit.bundle.js'))
        .pipe(gulp.dest('./build/'));
});

///
/// before starting the build, the compress task must be completed
///
gulp.task('build', ['compress'], function(){

    // gulp.start('codeplex-zip');
    gulp.start('build-integrationtest');
});

///
/// executes the unit-tests using karma (run test once and exit)
///
gulp.task('test', function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

// process that monitors the files
gulp.task('watch', function() {
 
    var sourcefiles = [
        './src/*.js',
        './test/helper/*.js',
        './test/spec/*.js',
        '!./**/*.min.js'];
 
    // adds a watch that executes the tasks
    // everytime a source-file is modified
    return gulp.watch( sourcefiles, ['lint', 'compress']);
});
