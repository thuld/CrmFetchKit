"use strict";
var gulp = require('gulp');
var rename = require("gulp-rename");
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var stylish = require('jshint-stylish');
var fileinclude = require('gulp-file-include');
var karma = require('karma').server;
var header = require('gulp-header');
var source = require('vinyl-source-stream');
var browserify = require('browserify');

var pkg = require('./package.json');


var banner = [
    '// <%= name %>.js <%= version %>',
    '// <%= homepage %>',
    '// <%= author %> \n',
    ].join('\n');
    
///
/// static code analysis
///
gulp.task('lint', function(){

    var sourcefiles = [
        './src/**/*.js',
        './test/spec/*.js',
        './test/helpers/*.js',
        '!./**/*.min.js',
        '!./**/*.bundle.js'];

    return gulp.src( sourcefiles )
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter( stylish ));
});

///
/// applies the minifcations
///
gulp.task('compress', ['browserify'], function() {

    return gulp.src('build/CrmFetchKit.bundle.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe( header(banner, pkg))
        .pipe(gulp.dest('./build') );
});

///
/// generates the testrunner html for the integration tests
///
gulp.task('build-specrunner', function() {

    return gulp.src(['./test/SpecRunner.tmpl'])
        .pipe(fileinclude( {
            context: { name: 'integration' }
        }))
        .pipe(replace('{{version}}', pkg.version))
        .pipe(rename("SpecRunner.html"))
        .pipe(gulp.dest('./test'));
});

// using vinyl-source-strea to browserify the module
gulp.task('browserify', function() {

    return browserify('./src/main.js')
        .bundle()
        .pipe(source('CrmFetchKit.bundle.js'))
        .pipe( header(banner, pkg))
        .pipe(gulp.dest('./build/'));
});

// using vinyl-source-strea to browserify the module
gulp.task('browserify-specs', function() {

    return browserify('./test/spec/soapParserSpec.js')
        .bundle()
        .pipe(source('soapParserSpec.bundle.js'))
        .pipe(gulp.dest('./test/spec/'));
});

///
/// before starting the build, the compress task must be completed
///
gulp.task('build', ['compress', 'browserify-specs'], function(){

    gulp.start('build-specrunner');
});

///
/// executes the unit-tests using karma (run test once and exit)
///
gulp.task('test', ['browserify-specs'], function (done) {
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
