var functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://cuckoos-nest-7a4cf.firebaseio.com"
});


// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// })

exports.createUser = functions.auth.user().onCreate(event => {
    const user = event.data;
    admin.database().ref(`/users/${user.uid}`).set({
        categoryFollowingCount: 0,
        displayName: user.displayName,
        image: user.photoURL, 
        numberOfFollowers: 0,
        numberOfFollowing: 0,
        numberOfUploads: 0,
        createdAt: new Date().toLocaleString(),
    });
});

exports.onUserUploadCreated = functions.database.ref('/uploads/{uploadId}')
    .onWrite(event => {
        const upload = event.data.val();
        // Add to user's uploads
        admin.database().ref(`/users/${upload.user}/uploads/${event.params.uploadId}`).set(true);
        
        // Increace user's upload count
        admin.database().ref(`/users/${upload.user}/numberOfUploads`).once('value').then(function(numberOfUploads) {
            admin.database().ref(`/users/${upload.user}/numberOfUploads`).set(numberOfUploads.val() + 1);
        });

        // Add to user's wall
        admin.database().ref(`/walls/${upload.user}/${event.params.uploadId}`).set(true);

        // Add to category followers wall
        admin.database().ref(`/photos/${upload.photo}`).once('value').then(function(photo) {
            if (photo.val()) {
                admin.database().ref(`/category-followers/category-to-users/${photo.val().category}`).once('value').then(function(followerKeys) {
                    if (followerKeys.val()) {
                        const followers = Object.keys(followerKeys.val());
                        for (const follower of followers) {
                            admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                        }
                    }
                });
            }
        });

        // Add to user's followers wall
        admin.database().ref(`/user-followers/users-follow-x/${upload.user}`).once('value').then(function(followerKeys) {
            if (followerKeys.val()) {
                const followers = Object.keys(followerKeys.val());
                for (const follower of followers) {
                    admin.database().ref(`/walls/${follower}/${event.params.uploadId}`).set(true);
                }
            }
        });
        
        
        // Add to photo's uploads
        admin.database().ref(`/photos/${upload.photo}/uploads/${event.params.uploadId}`).set(true);
        
    });

exports.onWallItemAdded = functions.database.ref('/wall/{userId}/')
    .onWrite(event => {
        
    });

exports.onUploadLikeAdded = functions.database.ref('/upload-likes/{uploadId}/{userId}')
    .onWrite(event => {
        if (!event.data.exists()) {
            // Unlike
            return;
        }

        // Not sure if it's necessary
        // Increace upload likes count
        // admin.database().ref(`/uploads/${event.params.uploadId}/likesCount`).once('value').then(function(likesCount) {
        //     admin.database().ref(`/uploads/${event.params.uploadId}/likesCount`).set(likesCount.val() + 1);
        // });

        // Send notification
        admin.database().ref(`/uploads/${event.params.uploadId}/`).once('value').then(function(upload) {
            if (upload.exists()) {
                admin.database().ref(`/notifications/${upload.val().user}`).push({
                    type: 1,
                    from: event.params.userId,
                    upload: event.params.uploadId,
                    isRead: false,
                    createdAt: new Date().toLocaleString(),
                });
            }
        });
    });

exports.clearUploads = functions.https
    .onRequest((req, res) => {
        // Implement..
        //admin.database().ref(`/uploads`).set(null);
    });

exports.clearUsers = functions.https
    .onRequest((req, res) => {
        // Implement..
    });