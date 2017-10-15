import { User } from '../functions/interface';

declare let firebase: any;

// Initialize Firebase
let config = {
    apiKey: "AIzaSyBz1z_mA1sZsQNYTh8RK8p76aE_gU-xcGc",
    authDomain: "cuckoos-nest-7a4cf.firebaseapp.com",
    databaseURL: "https://cuckoos-nest-7a4cf.firebaseio.com",
    projectId: "cuckoos-nest-7a4cf",
    storageBucket: "cuckoos-nest-7a4cf.appspot.com",
    messagingSenderId: "374424090153"
};

firebase.initializeApp(config);

window.onload = () => {
    document.querySelector("body").style.display = 'none';
    let provider = new firebase.auth.FacebookAuthProvider();
    // provider.setCustomParameters({
    //     'display': 'popup'
    // });
    firebase.auth().signInWithPopup(provider).then((result) => {

        let user: User = result.user;
        document.getElementById("welcome_message").innerText = `Welcome, ${user.displayName}`;

        firebase.database().ref("/categories").once('value').then((snapshot) => {
            let select: any = document.getElementById("photo_category");
            let categories = snapshot.val();

            for (let key in categories) {
                let option = document.createElement("option");
                option.value = key;
                option.text = categories[key].name;
                select.add(option);
            }

            document.querySelector("body").style.display = 'block';
        });

        let photo_submit = document.getElementById("photo_submit");
        photo_submit.onclick = () => {
            photo_submit.setAttribute("disabled", "disabled");
            let title: any = document.getElementById("photo_title");
            let category: any = document.getElementById("photo_category");
            let image: any = document.getElementById("photo_image");

            if (title.value.length > 3 && image.files.length == 1) {
                let file = image.files[0];
                let reader = new FileReader();

                reader.onload = (readerEvt: any) => {
                    let binaryString = readerEvt.target.result;
                    let ref = firebase.storage().ref(`/images/photos/${new Date().toISOString()}`);
                    ref
                        .put(binaryString, { contentType: 'image/jpeg' })
                        .then(() => {
                            ref.getDownloadURL().then(url => {
                                let pushResult = firebase.database().ref("/photos").push({
                                    title: title.value,
                                    category: category.value,
                                    image: url
                                });

                                pushResult.then(() => {
                                    let photoKey = pushResult.getKey();
                                    firebase.database().ref(`/categories/${category.value}/photos/${photoKey}`).set(true)
                                        .then(() => {
                                            alert("Photo created successfuly");
                                            photo_submit.removeAttribute("disabled");
                                            image.value = "";
                                            title.value = "";
                                        });
                                });
                            });
                        });
                };

                reader.readAsArrayBuffer(file);
            }
        };

        let category_submit = document.getElementById("category_submit");
        category_submit.onclick = () => {
            category_submit.setAttribute("disabled", "disabled");
            let name: any = document.getElementById("category_name");
            let image: any = document.getElementById("category_image");

            if (name.value.length > 3 && image.files.length == 1) {
                let file = image.files[0];
                let reader = new FileReader();

                reader.onload = (readerEvt: any) => {
                    let binaryString = readerEvt.target.result;
                    let ref = firebase.storage().ref(`/images/categories/${new Date().toISOString()}`);
                    ref
                        .put(binaryString, { contentType: 'image/jpeg' })
                        .then(() => {
                            ref.getDownloadURL().then(url => {
                                firebase.database().ref("/categories").push({
                                    name: name.value,
                                    image: url
                                }).then(() => {
                                    alert("Category created successfuly");
                                    category_submit.removeAttribute("disabled");
                                    name.value = "";
                                    image.value = "";
                                });
                            });
                        });
                };

                reader.readAsArrayBuffer(file);
            }
        };
    }).catch(err => alert(`Authentication error: ${err}`));
}

const getBase64Image = (img): string => {
    // Create an empty canvas element
    let canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    let ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Get the data-URL formatted image
    // Firefox supports PNG and JPEG. You could check img.src to guess the
    // original format, but be aware the using "image/jpg" will re-encode the image.
    let dataURL = canvas.toDataURL("image/png");

    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}
