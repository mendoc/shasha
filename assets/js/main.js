$(document).ready(function () {
	// Variables
	let delete_mode = false;
	let show_notif = false;
	let windowObjectReference;
	let last_message = "Nouveau post publié sur la plateforme de partage";
	window.name = "post_app_v2";
	const config = {
		apiKey: "AIzaSyC3pt7TQXG32aworFO6Zp4JgrVz1g8jXLQ",
		authDomain: "nomadic-rush-162313.firebaseapp.com",
		databaseURL: "https://nomadic-rush-162313.firebaseio.com",
		storageBucket: "nomadic-rush-162313.appspot.com",
		messagingSenderId: "167801823211"
	};

	// Fonctions
	function writeNewPost(texte) {
		if (texte.length > 300) return;

		// Le post à enregistrer
		const postData = {
			uid: Date.now(),
			texte: texte
		};

		// Génération d'une clé pour le noueau post
		const newPostKey = firebase.database().ref().child('posts').push().key;

		let updates = {};
		updates['/posts/' + newPostKey] = postData;

		$('#post-content').val('');

		// Mise à jour de la collection
		return firebase.database().ref().update(updates);
	}

	function zeroBefore(num) {
		return num < 10 ? "0" + num : num;
	}

	function updateNbChars() {
		$("#nb-chars").text($('#post-content').val().length);
	}

	function getDateFormat(uid) {
		const d = new Date(uid);

		let hour = zeroBefore(d.getHours());
		let mins = zeroBefore(d.getMinutes());

		if (Date.now() - uid <= 24 * 60 * 60 * 1000) {
			return `auj. à ${hour}:${mins}`;
		}
		else if (Date.now() - uid <= 2 * 24 * 60 * 60 * 1000) {
			return `hier à ${hour}:${mins}`;
		}
		else if (Date.now() - uid <= 3 * 24 * 60 * 60 * 1000) {
			return `avant-hier à ${hour}:${mins}`;
		}

		let day = zeroBefore(d.getDate());
		let month = zeroBefore(d.getMonth() + 1);

		return `le ${day}/${month} à ${hour}:${mins}`;
	}

	function addPost(key, texte, uid) {
		const pubDate = getDateFormat(uid);
		$('#all-posts').prepend(
			`<div class="post card ${delete_mode ? 'delete' : ''}" id="${key}">
				<div class="card-body animate__animated animate__fadeIn">
					<p class="card-text post-text">${texte}</p>
					<blockquote class="blockquote mb-0">
						<footer class="blockquote-footer"><small class="text-muted">Posté <cite title="Date de publication"><time datetime="${uid}">${pubDate}</time></cite></small>
						</footer>
					</blockquote>
				</div>
			</div>`
		);
		$(`#${key}`).click(function () {
			if (delete_mode) {
				const post = firebase.database().ref('/posts/' + key);
				post.remove();
			}
		});
	}

	function notifyMe() {
		if (Notification.permission !== "granted") Notification.requestPermission();
		else {
			if (!show_notif) return;
			let notification = new Notification('Nouveau post', {
				icon: 'http://sdz-upload.s3.amazonaws.com/prod/upload/ic_launcher-web1.png',
				body: last_message,
			});

			notification.onclick = function () {
				notification.close();
				windowObjectReference = window.focus();
			};
		}
	}

	function checkUpdate() {
		fetch("/version").then(r => {
			return r.text();
		}).then(v => {
			const version = v;
			console.log(v);
			$("#version").text(version);
			$("#version").css("opacity", "1");
		}).catch(console.log)
	}

	//######################## Traitements ############################
	if (Notification) {
		if (Notification.permission !== "granted") Notification.requestPermission();
	}

	setInterval(checkUpdate, 10000);

	$("#form-ecrire-post").submit(function (e) {
		return e.preventDefault();
	})

	$("#btn-charger-fichier").click(function () {
		$('[name="fichier"]').click();
	});

	$('[name="fichier"]').change(function () {
		$("#form-charger-fichier").submit();
	})

	// Initialisation de Firebase
	firebase.initializeApp(config);

	// Récupération de la référence de la collection des posts
	const ref = firebase.database().ref('/posts');

	// Ecoute des modification de la collection post
	ref.on('value', function (snapshot) {
		$('#all-posts').empty();
		snapshot.forEach(function (childSnapshot) {
			var childKey = childSnapshot.key;
			var childData = childSnapshot.val();
			last_message = childData.texte;
			addPost(childKey, childData.texte, childData.uid);
		});

		$('.post-text').linkify({
			target: "_blank",
			className: 'lien text-lighten-2'
		});
		$('.post').click(function (e) {
			console.log(e.target)
			if (!$(e.target).hasClass('lien') && !delete_mode) {
				$("#box-details div.content").html($(this).html());
				$("#box-details").show();
			}
		});
		if (!document.hasFocus()) notifyMe();
		show_notif = true;
		$("#loader").hide();
		updateNbChars();
	});

	$('#box-details').click(function (e) {
		let target = $(e.target);
		if (target.hasClass('back'))
			$("#box-details").hide();
	});

	// Ecoute des touches dans le champ de saisie du post
	$('#post-content').keyup(function (e) {
		var key = e.keyCode;
		var val = $(this).val().trim();
		updateNbChars();
		if (key == 13 && val) {
			if (val === "!delete") {
				let posts = $('.post');
				if (delete_mode) {
					posts.removeClass('delete');
					$('#post-content').val('');
				}
				else {
					posts.addClass('delete');
					$('#post-content').val('!delete');
				}
				delete_mode = !delete_mode;
			} else {
				writeNewPost(val);
			}
		}
	});

	// Annulation du mode delete avec la touche echap
	$(document).keyup(function (e) {
		var key = e.keyCode ? e.keyCode : e.which;
		if (e.keyCode === 27) {
			let posts = $('.post');
			if (delete_mode) {
				posts.removeClass('delete');
				$('#post-content').val('');
				delete_mode = false;
				updateNbChars();
			}
		}
	});
});