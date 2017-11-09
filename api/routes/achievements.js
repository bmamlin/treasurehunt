var halson = require('halson');
var Achievement = require('../models/achievement');
var sanitize = require('mongo-sanitize');
var shortid = require('shortid');
var logger = require('../log');

module.exports = function(app, router, requireAuth) {
  'use strict';

  // This will handle call to /achievements/:id
  router.route('/:id')

  .get(function(req, res) {
    // Return achievement
    var id = sanitize(req.params.id);
    logger.debug('Searching for achievement: %s', id);
    Achievement.findOne({id: id}, function(err, achievement) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to get achievement"});
      } else if (achievement === null) {
        res.status(404);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Not found"});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          image_url: achievement.image_url,
          url: achievement.url,
          created_at: achievement.created_at,
          updated_at: achievement.updated_at
        }).addLink(
          'self',
          '/achievements/' + achievement.id
        );
        res.send(JSON.stringify(resource));        
      }
    });
  }) 

  .put(requireAuth, function(req, res) {
    // Replace or create achievement
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var id = sanitize(req.params.id);
    Achievement.update({
      id: id
    }, {
      id: id,
      name: sanitize(req.body.name),
      description: sanitize(req.body.description),
      image_url: sanitize(req.body.image_url),
      url: sanitize(req.body.url)
    }, {
      upsert: true
    }, function(err, raw) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to update achievement"});
      } else {
        var id = sanitize(req.params.id);
        Achievement.findOne({id: id}, function(err, achievement) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: "Failed to get achievement"});
          } else {
            res.status(200);
            res.setHeader('Content-Type', 'application/json');
            var resource = halson({
              id: achievement.id,
              name: achievement.name,
              description: achievement.description,
              image_url: image_url,
              url: achievement.url,
              created_at: achievement.created_at,
              updated_at: achievement.updated_at
            }).addLink(
              'self',
              '/achievements/' + achievement.id
            );
            res.send(JSON.stringify(resource));
          }
        });       
      }
    });
  })

  .patch(requireAuth, function(req, res) {
    // Patch achievement
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var id = sanitize(req.params.id);
    Achievement.findOne({
      id: id
    }, function(err, achievement) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Unable to find achievement"});
      } else {
        if (req.body.name) {
          logger.debug('Achievement %s name changed to %s',achievement._id,req.body.name);
          achievement.name = sanitize(req.body.name);
        }
        if (req.body.description) {
          achievement.description = sanitize(req.body.description);
        }
        if (req.body.image_url) {
          achievement.image_url = sanitize(req.body.image_url);
        }
        if (req.body.url) {
          achievement.url = sanitize(req.body.url);
        }
        Achievement.update({_id:achievement._id},achievement,function(err, raw) {
          if (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/vnd.error+json');
            res.json({ message: "Failed to update achievement"});
          } else {
            logger.debug("Response from mongo: %s", JSON.stringify(raw));
            Achievement.findOne({id: id}, function(err, achievement) {
              if (err) {
                res.status(500);
                res.setHeader('Content-Type', 'application/vnd.error+json');
                res.json({ message: "Failed to update achievement"});
              } else {
                res.status(200);
                res.setHeader('Content-Type', 'application/json');
                var resource = halson({
                  id: achievement.id,
                  name: achievement.name,
                  description: achievement.description,
                  image_url: achievement.image_url,
                  url: achievement.url,
                  created_at: achievement.created_at,
                  updated_at: achievement.updated_at
                }).addLink(
                  'self',
                  '/achievements/' + Achievement.id
                );
                res.send(JSON.stringify(resource));
              }
            });       
          }
        });
      }
    });
  })

  .delete(requireAuth, function(req, res) {
    // Delete achievement
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    var id = sanitize(req.params.id);
    logger.debug('Deleting achievement %s', id);
    Achievement.find({id:id}).remove(function(err) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to remove achievement"});
      } else {
        res.status(204).send();
      }
    })
  });

  // This will handle calls to /achievements
  router.route('/')
  
  .get(function(req, res) {
    // Return all achievements
    logger.debug('achievements requested');
    Achievement.find({}, function(err, achievements) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to get achievements"});
      } else {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        var result = [];
        for (var i in achievements) {
          var resource = halson({
            id: achievements[i].id,
            name: achievements[i].name,
            description: achievements[i].description,
            image_url: achievements[i].image_url,
            url: achievements[i].url,
            created_at: achievements[i].created_at,
            updated_at: achievements[i].updated_at
          }).addLink(
            'self',
            '/achievements/' + achievements[i].id
          );
          result.push(resource);
        }
        res.send(JSON.stringify(result));
      }
    });
  })

  .post(requireAuth, function(req, res) {
    // Create new achievement
    if (!req.user.admin) {
      res.status(401);
      res.setHeader('Content-Type', 'application/vnd.error+json');
      res.json({ message: 'Not authorized'});
      return;
    }
    Achievement.create({
      id: shortid.generate(),
      name: sanitize(req.body.name),
      description: sanitize(req.body.description),
      image_url: sanitize(req.body.image_url),
      url: sanitize(req.body.url)
    }, function(err, newAchievement) {
      if (err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/vnd.error+json');
        res.json({ message: "Failed to save achievement"});
      } else {
        res.status(201);
        res.setHeader('Content-Type', 'application/json');
        var resource = halson({
          id: newAchievement.id,
          name: newAchievement.name,
          description: newAchievement.description,
          image_url: newAchievement.image_url,
          url: newAchievement.url,
          created_at: newAchievement.created_at
        }).addLink(
          'self',
          '/achievements/' + newAchievement.id
        );
        res.send(JSON.stringify(resource));        
      }
    });
  });

};