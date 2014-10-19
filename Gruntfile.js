'use strict';

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    copy: {
      dist: {
        files: [{
          expand: true,
          flatten: true,
          cwd: '',
          dest: 'dist',
          src: [
            'bower_components/jquery/jquery.min.js',
            'bower_components/jquery-ui/jquery-ui.min.js'
          ]
        }]
      }
    },

    uglify: {
      dist: {
        files: {
          'dist/jquery.annotate.min.js': ['js/jquery.annotate.js'],
          'dist/jquery.annotate.concat.min.js': [
          	'dist/jquery.min.js',
          	'dist/query-ui.min.js',
          	'js/jquery.annotate.js'
          ]
        }
      }
    }

  });

  grunt.registerTask('default', [
    'copy',
    'uglify'
  ]);

};