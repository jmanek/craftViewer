module.exports = function(grunt) {
  


  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-watch');
  require('load-grunt-tasks')(grunt); 
  

  grunt.initConfig({
    
    concurrent:{
      start: {
          tasks: ['exec:nwjs', 'watch'],
          options: {
                logConcurrentOutput: true
          }
      }
    },
    exec: {
      nwjs: 'npm start'
    },
    babel: {
        options: {
            sourceMap: true,
            stage: 0
        },
        dist: {
            files: [{
                    "expand": true,
                    "cwd": "src/",
                    "src": ["**/*.js"],
                    "dest": "build/js/",
                    "ext": ".js"
                }]
        }
    },
    watch: {
      scripts: {
        files: ['src/*.js'],
        tasks: ['babel']
      },
    }




  });

  grunt.registerTask('default', ['babel', 'concurrent:start']);
};