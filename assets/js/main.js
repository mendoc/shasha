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
	function deleteFile() {

	}

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

	// Retourne le timestamp du début de la journée (minuit) pour un timestamp donné
	function getDayStart(timestamp) {
		const d = new Date(timestamp);
		d.setHours(0, 0, 0, 0);
		return d.getTime();
	}

	// Retourne une clé unique par jour (YYYY-MM-DD) pour le regroupement
	function getDayKey(uid) {
		const d = new Date(uid);
		return `${d.getFullYear()}-${zeroBefore(d.getMonth() + 1)}-${zeroBefore(d.getDate())}`;
	}

	// Retourne le libellé du jour pour l'en-tête de groupe
	function getDayLabel(uid) {
		const now = new Date();
		const todayStart = getDayStart(now.getTime());
		const postDayStart = getDayStart(uid);
		const diffDays = Math.round((todayStart - postDayStart) / 86400000);

		if (diffDays === 0) return "Aujourd'hui";
		if (diffDays === 1) return "Hier";
		if (diffDays === 2) return "Avant-hier";

		const d = new Date(uid);
		const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
		const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

		const currentYear = now.getFullYear();
		const postYear = d.getFullYear();

		if (postYear === currentYear) {
			const dayName = dayNames[d.getDay()];
			const day = zeroBefore(d.getDate());
			const month = zeroBefore(d.getMonth() + 1);
			return `${dayName} ${day}/${month}`;
		} else {
			const monthName = monthNames[d.getMonth()];
			return `${d.getDate()} ${monthName} ${postYear}`;
		}
	}

	// Retourne l'heure formatée pour l'affichage dans la carte
	function getDateFormat(uid) {
		const d = new Date(uid);
		let hour = zeroBefore(d.getHours());
		let mins = zeroBefore(d.getMinutes());
		return `${hour}:${mins}`;
	}

	function addPost(key, texte, uid, $container) {
		const pubDate = getDateFormat(uid);
		$container.append(
			`<div class="post card ${delete_mode ? 'delete' : ''}" id="${key}">
				<div class="card-body animate__animated animate__fadeIn">
					<p class="card-text post-text">${texte}</p>
					<blockquote class="blockquote mb-0">
						<footer class="blockquote-footer"><small class="text-muted"><cite title="Date de publication"><time datetime="${uid}">${pubDate}</time></cite></small>
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
		}).then(versionSW => {
			console.log(versionSW)
			fetch("/version.json").then(r => {
				return r.json();
			}).then(versionJson => {
				if (versionJson.version == versionSW) {
					$("#version").text(versionSW);
					$("#version").removeClass("bg-danger");
					$("#version").addClass("bg-success");
					$("#version").css("opacity", "1");
				} else {
					if (versionSW.includes("<")) {
						$("#version").css("opacity", "0");
					} else {
						$("#version").text(versionSW);
						$("#version").removeClass("bg-success");
						$("#version").addClass("bg-danger");
						$("#version").css("opacity", "1");
					}
				}
			}).catch(console.log)
		}).catch(console.log)
	}

	//######################## Traitements ############################
	if (Notification) {
		if (Notification.permission !== "granted") Notification.requestPermission();
	}

	checkUpdate();
	setInterval(checkUpdate, 10000);

	$("#form-ecrire-post").submit(function (e) {
		return e.preventDefault();
	});

	$(`.file`).click(function () {
		let fileURL = $(this).data("url");
		if (delete_mode) {
			location.href = `?d=${fileURL}`;
		} else {
			window.open(`?f=${fileURL}`);
		}
	});

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

		// Collecte et tri des posts par date décroissante
		let posts = [];
		snapshot.forEach(function (childSnapshot) {
			var childKey = childSnapshot.key;
			var childData = childSnapshot.val();
			posts.push({ key: childKey, texte: childData.texte, uid: childData.uid });
		});
		posts.sort(function (a, b) { return b.uid - a.uid; });

		// Regroupement par jour et rendu
		let currentDayKey = null;
		let $currentCardColumns = null;
		posts.forEach(function (post) {
			const dayKey = getDayKey(post.uid);
			if (dayKey !== currentDayKey) {
				currentDayKey = dayKey;
				const label = getDayLabel(post.uid);
				const $dayGroup = $('<div class="day-group"></div>');
				$dayGroup.append(`<div class="day-separator"><span>${label}</span></div>`);
				$currentCardColumns = $('<div class="card-columns"></div>');
				$dayGroup.append($currentCardColumns);
				$('#all-posts').append($dayGroup);
			}
			last_message = post.texte;
			addPost(post.key, post.texte, post.uid, $currentCardColumns);
		});

		$('div.nb-posts span').text(snapshot.numChildren() + " posts");
		$('div.nb-posts').show();
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
				let files = $('.file');
				if (delete_mode) {
					posts.removeClass('delete');
					files.removeClass('delete');
					$('#post-content').val('');
				}
				else {
					posts.addClass('delete');
					files.addClass('delete');
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
			let files = $('.file');
			if (delete_mode) {
				posts.removeClass('delete');
				files.removeClass('delete');
				$('#post-content').val('');
				delete_mode = false;
				updateNbChars();
			}
		}
	});
});
