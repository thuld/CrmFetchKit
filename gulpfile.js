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

var browserify = require('browserify');
var through2 = require('through2');

var endOfLine = require('os').EOL;

// package details
var pkg = require('./package.json');

var banner = [
    '// <%= name %>.js <%= version %>',
    '// <%= homepage %>',
    '// <%= author %>' + endOfLine
    ].join(endOfLine);

// static code analysis
gulp.task('lint', function(){

    var files = [
        './src/**/*.js',
        './test/spec/*.js',
        './test/helpers/*.js',
        '!./**/*.min.js',
        '!./**/*.bundle.js'];

    return gulp.src( files )
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter( stylish ));
});

// applies the minifcations
gulp.task('compress', ['browserify'], function() {

    return gulp.src('build/CrmFetchKit.bundle.js')
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./build') );
});

/// generates the testrunner html for the integration tests
gulp.task('build-specrunner', function() {

    return gulp.src(['./test/SpecRunner.tmpl'])
        .pipe(fileinclude( {
            context: { name: 'integration' }
        }))
        .pipe(replace('{{version}}', pkg.version))
        .pipe(rename("SpecRunner.html"))
        .pipe(gulp.dest('./test'));
});


gulp.task('browserify-specs', function() {

    var files = [
        './test/spec/*Spec.js',
        '!./test/spec/integrationSpec.js' ];

    return gulp.src(files)
      .pipe(through2.obj(function (file, enc, next){
              browserify(file.path)
                  .bundle(function(err, res){
                      // assumes file.contents is a Buffer
                      file.contents = res;
                      next(null, file);
                  });
          }))
      .pipe(rename({suffix: '.bundle'}))
      .pipe(gulp.dest('./test/spec/'));
});


gulp.task('browserify', function(){

  return gulp.src('./src/main.js')
    .pipe(through2.obj(function (file, enc, next){
            browserify(file.path)
                .bundle(function(err, res){
                    // assumes file.contents is a Buffer
                    file.contents = res;
                    next(null, file);
                });
        }))
    .pipe(rename('CrmFetchKit.bundle.js'))
    .pipe(gulp.dest('./build/'))
});

/// before starting the build, the compress task must be completed
gulp.task('build', ['compress', 'browserify-specs'], function(){

    gulp.start('build-specrunner');

    return gulp.src('./build/*.js')
        .pipe(header(banner, pkg))
        .pipe(gulp.dest('./build'));

});

/// executes the unit-tests using karma (run test once and exit)
gulp.task('test', ['browserify-specs'], function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

// process that monitors the files
gulp.task('watch', function() {
 
    var files = [
        './src/**/*.js',
        './test/helper/*.js',
        './test/spec/*.js',
        '!./**/*.min.js',
        '!./**/*.bundle.js'];
 
    // adds a watch that executes the tasks
    // everytime a source-file is modified
    return gulp.watch(files, ['lint', 'build']);
});
