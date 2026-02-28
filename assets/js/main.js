$(document).ready(function () {
	// Variables
	let delete_mode = false;
	window.name = "post_app_v2";

	// Lazy loading
	const BATCH_SIZE = 10;
	let recentOldestUID = null;
	let paginationOldestUID = null;
	let allPostsLoaded = false;
	let loadingMore = false;
	const olderDayGroups = {};

	const config = {
		apiKey: "AIzaSyC3pt7TQXG32aworFO6Zp4JgrVz1g8jXLQ",
		authDomain: "nomadic-rush-162313.firebaseapp.com",
		databaseURL: "https://nomadic-rush-162313.firebaseio.com",
		projectId: "nomadic-rush-162313",
		storageBucket: "nomadic-rush-162313.appspot.com",
		messagingSenderId: "167801823211",
		appId: "1:167801823211:web:d788e011834f5528a683ae"
	};

	// Fonctions
	function deleteFile() {

	}

	// Supprime automatiquement les posts vieux de plus d'un mois
	function deleteOldPosts() {
		const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
		firebase.database().ref('/posts').orderByChild('uid').endAt(oneMonthAgo).once('value', function (snapshot) {
			snapshot.forEach(function (childSnapshot) {
				childSnapshot.ref.remove();
			});
		});
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
		const promise = firebase.database().ref().update(updates);

		// Envoyer une notification push aux appareils hors ligne
		promise.then(function() {
			fetch('push.php', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ postKey: newPostKey, texte: texte })
			}).catch(function() {});
		});

		return promise;
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

	// Extrait la première URL d'un texte (en nettoyant la ponctuation finale)
	function extractFirstUrl(text) {
		const match = text.match(/(https?:\/\/[^\s]+)/);
		if (!match) return null;
		return match[0].replace(/[.,;:!?)"']+$/, '');
	}

	// Retourne true si le texte ne contient que l'URL (rien d'autre)
	function isOnlyUrl(text) {
		return /^https?:\/\/\S+$/.test(text.trim());
	}

	// Injecte un header OG dans la card à partir de données déjà connues
	function displayOG(key, ogData) {
		const $card = $('#' + key);
		if (!$card.length) return;
		if ($card.find('.og-preview').length) return; // Évite l'affichage en double

		let html = '<div class="og-preview">';
		if (ogData.image) {
			html += `<img src="${ogData.image}" class="og-image" alt="" loading="lazy">`;
		}
		if (ogData.title || ogData.description) {
			html += '<div class="og-text">';
			if (ogData.site_name) {
				html += `<span class="og-site">${ogData.site_name}</span>`;
			}
			if (ogData.title) {
				html += `<strong class="og-title">${ogData.title}</strong>`;
			}
			if (ogData.description) {
				html += `<p class="og-description">${ogData.description}</p>`;
			}
			html += '</div>';
		}
		html += '</div>';
		$card.prepend(html);
	}

	// Récupère les métadonnées OG via og.php, les sauvegarde dans Firebase, puis les affiche
	function fetchAndDisplayOG(key, url) {
		fetch('og.php?url=' + encodeURIComponent(url))
			.then(function (r) { return r.json(); })
			.then(function (data) {
				const hasData = data && !data.error && (data.title || data.image || data.description);
				const ogValue = hasData
					? { title: data.title || null, description: data.description || null, image: data.image || null, site_name: data.site_name || null }
					: false;

				// Persister dans Firebase pour éviter les re-fetch ultérieurs
				firebase.database().ref('/posts/' + key + '/og').set(ogValue);

				if (ogValue) displayOG(key, ogValue);
			})
			.catch(function () { /* échec silencieux, on réessaiera au prochain chargement */ });
	}

	// og : undefined = pas encore récupéré | false = pas de données OG | objet = données en cache
	function addPost(key, texte, uid, og, $container) {
		const pubDate = getDateFormat(uid);
		const firstUrl = extractFirstUrl(texte);
		const displayText = texte.length > 100 ? texte.substring(0, 100) + '…' : texte;
		const escapedTexte = texte.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
		const copyBtn = `<button class="btn-copy-link" data-text="${escapedTexte}" title="Copier"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
		$container.append(
			`<div class="post card ${delete_mode ? 'delete' : ''}" id="${key}">
				<div class="card-body animate__animated animate__fadeIn">
					<p class="card-text post-text" data-full-text="${escapedTexte}">${displayText}</p>
					<blockquote class="blockquote mb-0">
						<footer class="blockquote-footer">${copyBtn}<small class="text-muted"><cite title="Date de publication"><time datetime="${uid}">${pubDate}</time></cite></small>
						</footer>
					</blockquote>
				</div>
			</div>`
		);

		if (og === false) return;                          // lien sans OG connu, ne pas re-tenter
		if (og && (og.title || og.image)) { displayOG(key, og); return; } // données en cache

		if (firstUrl) fetchAndDisplayOG(key, firstUrl);
	}

	// Rend un tableau de posts dans un conteneur en groupes par jour (vide le conteneur avant)
	function renderPostsIntoDayGroups(posts, $container) {
		$container.empty();
		Object.keys(olderDayGroups).forEach(function (k) { delete olderDayGroups[k]; });
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
				$container.append($dayGroup);
				olderDayGroups[dayKey] = $currentCardColumns;
			}
			addPost(post.key, post.texte, post.uid, post.og, $currentCardColumns);
		});
	}

	// Ajoute des posts anciens à #older-posts en réutilisant les groupes de jours existants
	function appendPostsToDayGroups(posts) {
		let currentDayKey = null;
		let $currentCardColumns = null;
		posts.forEach(function (post) {
			const dayKey = getDayKey(post.uid);
			if (dayKey !== currentDayKey) {
				currentDayKey = dayKey;
				if (olderDayGroups[dayKey]) {
					$currentCardColumns = olderDayGroups[dayKey];
				} else {
					const label = getDayLabel(post.uid);
					const $dayGroup = $('<div class="day-group"></div>');
					$dayGroup.append(`<div class="day-separator"><span>${label}</span></div>`);
					$currentCardColumns = $('<div class="card-columns"></div>');
					$dayGroup.append($currentCardColumns);
					$('#older-posts').append($dayGroup);
					olderDayGroups[dayKey] = $currentCardColumns;
				}
			}
			addPost(post.key, post.texte, post.uid, post.og, $currentCardColumns);
		});
		applyPostProcessing();
	}

	function updateLoadedCount() {
		const total = $('.post').length;
		$('div.nb-posts span').text(total + " posts chargés");
		$('div.nb-posts').show();
	}

	function applyPostProcessing() {
		$('.post-text').linkify({
			target: "_blank",
			className: 'lien text-lighten-2'
		});
		updateLoadedCount();
	}

	// Charge le prochain lot de posts plus anciens
	function loadMorePosts() {
		if (allPostsLoaded || loadingMore) return;
		const queryUID = paginationOldestUID !== null ? paginationOldestUID : recentOldestUID;
		if (queryUID === null) return;

		loadingMore = true;
		$('#load-more-loader').show();

		firebase.database().ref('/posts').orderByChild('uid').endAt(queryUID - 1).limitToLast(BATCH_SIZE).once('value', function (snapshot) {
			loadingMore = false;
			$('#load-more-loader').hide();

			let posts = [];
			snapshot.forEach(function (childSnapshot) {
				var childData = childSnapshot.val();
				posts.push({ key: childSnapshot.key, texte: childData.texte, uid: childData.uid, og: childData.og });
			});
			posts.sort(function (a, b) { return b.uid - a.uid; });

			if (posts.length === 0) {
				allPostsLoaded = true;
				$('#load-more-sentinel').hide();
				return;
			}

			paginationOldestUID = posts[posts.length - 1].uid;

			if (posts.length < BATCH_SIZE) {
				allPostsLoaded = true;
				$('#load-more-sentinel').hide();
			}

			appendPostsToDayGroups(posts);
		});
	}

	let pendingVersion = null;

	function checkUpdate() {
		fetch("version.json").then(r => r.json()).then(versionJson => {
			const serverVersion = versionJson.version;
			const storedVersion = localStorage.getItem("app-version");

			if (storedVersion === null) {
				localStorage.setItem("app-version", serverVersion);
				$("#version").text(serverVersion).removeClass("bg-danger").addClass("bg-success").css("opacity", "1");
				$("#box-update").hide();
			} else if (storedVersion === serverVersion) {
				$("#version").text(serverVersion).removeClass("bg-danger").addClass("bg-success").css("opacity", "1");
				$("#box-update").hide();
			} else {
				pendingVersion = serverVersion;
				$("#version").text(storedVersion).removeClass("bg-success").addClass("bg-danger").css("opacity", "1");
				$("#box-update").show();
			}
		}).catch(console.log);
	}

	$("#btn-update").click(async function () {
		$(this).prop("disabled", true).text("Mise à jour en cours…");
		try {
			if (pendingVersion) localStorage.setItem("app-version", pendingVersion);
			const keys = await caches.keys();
			await Promise.all(keys.map(key => caches.delete(key)));
			const registrations = await navigator.serviceWorker.getRegistrations();
			await Promise.all(registrations.map(r => r.unregister()));
		} catch (e) {
			console.log(e);
		}
		location.reload(true);
	});

	//######################## Traitements ############################
	checkUpdate();
	setInterval(checkUpdate, 10000);

	$("#form-ecrire-post").submit(function (e) {
		return e.preventDefault();
	});

	$(`.file`).click(function (e) {
		if ($(e.target).closest('.btn-pin-file').length) return;
		let fileURL = $(this).data("url");
		if (delete_mode) {
			location.href = `?d=${fileURL}`;
		} else {
			window.open(`?f=${fileURL}`);
		}
	});

	// Épingler / désépingler un fichier
	$('#all-files').on('click', '.btn-pin-file', function (e) {
		e.stopPropagation();
		if (delete_mode) return;
		var $btn = $(this);
		var filename = $btn.data('file');
		fetch('epingler.php?f=' + encodeURIComponent(filename))
			.then(function (r) { return r.json(); })
			.then(function (data) {
				if (data.pinned !== undefined) {
					var $card = $btn.closest('.card');
					if (data.pinned) {
						$btn.addClass('pinned').attr('title', 'Désépingler');
						$btn.find('svg').attr('fill', 'currentColor');
						$card.find('small').text('Fichier épinglé').addClass('text-success');
					} else {
						location.reload();
					}
				}
			});
	});

	$("#btn-actualiser").click(function () {
		location.reload();
	});

	$("#btn-charger-fichier").click(function () {
		$('[name="fichier"]').click();
	});

	$('[name="fichier"]').change(function () {
		$("#form-charger-fichier").submit();
	})

	// Initialisation de Firebase
	firebase.initializeApp(config);

	// Suppression des posts vieux de plus d'un mois au chargement
	deleteOldPosts();

	// Initialisation Firebase Messaging pour les notifications en arrière-plan
	if ('serviceWorker' in navigator && 'PushManager' in window) {
		navigator.serviceWorker.ready.then(function(registration) {
			try {
				// Clé VAPID publique — Firebase Console > Paramètres du projet > Cloud Messaging > Web Push certificates
				const VAPID_KEY = 'BDDTdrPPjD_YHZ-W4MZEtrYF-kOFmLULZstd2JV4Ba0B_M_oTPmb0jl1VfELemsbGfmNF_VfwA04BXqmPZwVTsM';

				const messaging = firebase.messaging();

				const doSubscribe = function() {
					const tryGetToken = function() {
						return messaging.getToken({
							vapidKey: VAPID_KEY,
							serviceWorkerRegistration: registration
						}).then(function(token) {
							if (token) {
								console.log('[FCM] Token obtenu :', token);
								fetch('subscribe.php', {
									method: 'POST',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({ token: token })
								}).then(function(r) {
									return r.json();
								}).then(function(data) {
									console.log('[FCM] Abonnement topic new-posts :', data);
								}).catch(function(err) {
									console.warn('[FCM] Erreur abonnement topic :', err);
								});
							} else {
								console.warn('[FCM] getToken résolu mais aucun token disponible');
							}
						});
					};

					tryGetToken().catch(function(err) {
						console.error('[FCM] Erreur getToken :', err);
					});
				};

				// En premier plan, déléguer l'affichage au SW pour centraliser la gestion
				messaging.onMessage(function(payload) {
					console.log('[FCM] Message reçu en premier plan :', payload);
					const texte = payload.data && payload.data.texte ? payload.data.texte : 'Nouveau post publié';
					const postKey = payload.data && payload.data.postKey ? payload.data.postKey : '';
					registration.showNotification('Nouveau post', {
						body: texte.length > 100 ? texte.substring(0, 100) + '…' : texte,
						icon: '/assets/img/logo.png',
						data: { postKey: postKey }
					});
				});

				if (Notification.permission === 'granted') {
					console.log('[FCM] Permission notifications : accordée — tentative d\'abonnement');
					doSubscribe();
				} else if (Notification.permission === 'default') {
					console.log('[FCM] Permission notifications : non demandée — affichage de la demande');
					Notification.requestPermission().then(function(permission) {
						console.log('[FCM] Réponse permission notifications :', permission);
						if (permission === 'granted') doSubscribe();
					});
				} else {
					console.warn('[FCM] Permission notifications : refusée — les notifications push sont désactivées');
				}
			} catch(e) {
				// Firebase Messaging non disponible ou non supporté
				console.log('Firebase Messaging non disponible ou non supporté');
			}
		});

		// Écoute des messages du service worker (focus sur un post depuis une notification)
		navigator.serviceWorker.addEventListener('message', function(event) {
			if (event.data && event.data.type === 'SHOW_POST' && event.data.postKey) {
				showPostModalOrFetch(event.data.postKey);
			}
		});
	}

	// Traitement du texte partagé via le Web Share Target (depuis une autre app)
	const urlParams = new URLSearchParams(window.location.search);
	const sharedText = urlParams.get('shared_text');
	if (sharedText) {
		window.history.replaceState({}, document.title, window.location.pathname);
		writeNewPost(sharedText);
	}

	// Affichage d'un post au lancement depuis une notification (app était fermée)
	const notifPostKey = urlParams.get('notif_post');
	if (notifPostKey) {
		window.history.replaceState({}, document.title, window.location.pathname);
		window._pendingNotifPostKey = notifPostKey;
	}

	// Ecoute en temps réel des BATCH_SIZE posts les plus récents
	firebase.database().ref('/posts').orderByChild('uid').limitToLast(BATCH_SIZE).on('value', function (snapshot) {
		let posts = [];
		snapshot.forEach(function (childSnapshot) {
			var childData = childSnapshot.val();
			posts.push({ key: childSnapshot.key, texte: childData.texte, uid: childData.uid, og: childData.og });
		});
		posts.sort(function (a, b) { return b.uid - a.uid; });

		renderPostsIntoDayGroups(posts, $('#recent-posts'));

		if (posts.length > 0) {
			recentOldestUID = posts[posts.length - 1].uid;
		}

		applyPostProcessing();

		// Afficher le sentinel si le lot est complet (il peut y avoir plus de posts à charger)
		if (posts.length >= BATCH_SIZE && !allPostsLoaded) {
			$('#load-more-sentinel').show();
		}

		$("#loader").hide();
		updateNbChars();

		// Afficher le post depuis une notification (app était fermée)
		if (window._pendingNotifPostKey) {
			const pendingKey = window._pendingNotifPostKey;
			window._pendingNotifPostKey = null;
			showPostModalOrFetch(pendingKey);
		}
	});

	// Lazy loading avec IntersectionObserver
	const sentinel = document.getElementById('load-more-sentinel');
	if (sentinel && 'IntersectionObserver' in window) {
		const observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) loadMorePosts();
			});
		}, { threshold: 0.1 });
		observer.observe(sentinel);
	}

	// Gestion des clics sur les posts via délégation d'événements (modale + suppression)
	$('#all-posts').on('click', '.post', function (e) {
		if (delete_mode) {
			const key = $(this).attr('id');
			const $post = $(this);
			const $cardColumns = $post.closest('.card-columns');
			$post.remove();
			if ($cardColumns.length && $cardColumns.find('.post').length === 0) {
				Object.keys(olderDayGroups).forEach(function (dayKey) {
					if (olderDayGroups[dayKey].is($cardColumns)) {
						delete olderDayGroups[dayKey];
					}
				});
				$cardColumns.closest('.day-group').remove();
			}
			updateLoadedCount();
			firebase.database().ref('/posts/' + key).remove();
		} else if (!$(e.target).hasClass('lien') && !$(e.target).closest('.btn-copy-link').length) {
			const $modal = $("#box-details div.content");
			$modal.html($(this).html());
			$modal.find('.btn-copy-link').html(ICON_COPY).css('color', '');
			const $postText = $modal.find('.post-text');
			const fullText = $postText.data('full-text');
			if (fullText) {
				$postText.text(fullText);
				$postText.linkify({ target: "_blank", className: 'lien text-lighten-2' });
			}
			$("#box-details").show();
		}
	});

	const ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
	const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

	// Affiche un post dans la modale, ou le récupère depuis Firebase s'il n'est pas dans le DOM
	function showPostModalOrFetch(key) {
		const $post = $('#' + key);
		if ($post.length) {
			showPostModal(key);
		} else {
			firebase.database().ref('/posts/' + key).once('value', function(snap) {
				const data = snap.val();
				if (!data) return;
				const escapedTexte = data.texte.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
				const $modal = $("#box-details div.content");
				$modal.html(
					`<div class="card-body">
						<p class="card-text post-text" data-full-text="${escapedTexte}">${data.texte}</p>
						<blockquote class="blockquote mb-0">
							<footer class="blockquote-footer">
								<button class="btn-copy-link" data-text="${escapedTexte}" title="Copier">${ICON_COPY}</button>
							</footer>
						</blockquote>
					</div>`
				);
				$modal.find('.post-text').linkify({ target: "_blank", className: 'lien text-lighten-2' });
				$("#box-details").show();
			});
		}
	}

	// Affiche le contenu d'un post dans la modale (utilisé au clic sur une notification)
	function showPostModal(key) {
		const $post = $('#' + key);
		if (!$post.length) return;
		const $modal = $("#box-details div.content");
		$modal.html($post.html());
		$modal.find('.btn-copy-link').html(ICON_COPY).css('color', '');
		const $postText = $modal.find('.post-text');
		const fullText = $postText.data('full-text');
		if (fullText) {
			$postText.text(fullText);
			$postText.linkify({ target: "_blank", className: 'lien text-lighten-2' });
		}
		$("#box-details").show();
	}

	function copyWithFeedback($btn, text) {
		navigator.clipboard.writeText(text);
		$btn.html(ICON_CHECK).css('color', '#28a745');
		setTimeout(function () {
			$btn.html(ICON_COPY).css('color', '');
		}, 2000);
	}

	// Copier le texte d'un post dans le presse-papier
	$('#all-posts').on('click', '.btn-copy-link', function (e) {
		e.stopPropagation();
		copyWithFeedback($(this), $(this).data('text'));
	});

	$('#box-details').on('click', '.btn-copy-link', function (e) {
		e.stopPropagation();
		copyWithFeedback($(this), $(this).data('text'));
	});

	$('#box-details').click(function (e) {
		let target = $(e.target);
		if (target.hasClass('back'))
			$("#box-details").hide();
	});

	// ======================== Config modal ========================

	function addTag(ext) {
		ext = ext.replace(/[^a-z0-9]/g, '').toLowerCase();
		if (!ext) return;
		// Prevent duplicates
		const existing = $('#tag-input-wrapper .tag-item').map(function () {
			return $(this).data('ext');
		}).get();
		if (existing.includes(ext)) return;

		const $tag = $(`<span class="tag-item" data-ext="${ext}">${ext}<button class="tag-remove" title="Retirer">&times;</button></span>`);
		$tag.find('.tag-remove').on('click', function () {
			$tag.remove();
		});
		$('#tag-input-field').before($tag);
	}

	function openConfigModal() {
		$('#tag-input-wrapper .tag-item').remove();
		$('#tag-input-field').val('');
		fetch('config.php')
			.then(function (r) { return r.json(); })
			.then(function (data) {
				(data.extensions || []).forEach(addTag);
				$('#box-config').show();
				$('#tag-input-field').focus();
			})
			.catch(function () {
				$('#box-config').show();
				$('#tag-input-field').focus();
			});
	}

	$('#tag-input-wrapper').on('click', function (e) {
		if (!$(e.target).hasClass('tag-remove')) {
			$('#tag-input-field').focus();
		}
	});

	$('#tag-input-field').on('keydown', function (e) {
		var key = e.keyCode || e.which;
		if (key === 13 || key === 32) {
			e.preventDefault();
			var val = $(this).val().trim();
			if (val) {
				addTag(val);
				$(this).val('');
			}
		} else if (key === 8 && $(this).val() === '') {
			$('#tag-input-wrapper .tag-item').last().remove();
		}
	});

	$('#tag-input-field').on('blur', function () {
		var val = $(this).val().trim();
		if (val) {
			addTag(val);
			$(this).val('');
		}
	});

	$('#btn-config-cancel').on('click', function () {
		$('#box-config').hide();
		$('#post-content').val('');
		updateNbChars();
	});

	$('#btn-config-save').on('click', function () {
		var extensions = $('#tag-input-wrapper .tag-item').map(function () {
			return $(this).data('ext');
		}).get();

		fetch('config.php', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ extensions: extensions })
		})
			.then(function (r) { return r.json(); })
			.then(function () {
				$('#box-config').hide();
				$('#post-content').val('');
				updateNbChars();
			})
			.catch(function () {
				$('#box-config').hide();
				$('#post-content').val('');
				updateNbChars();
			});
	});

	$('#box-config').on('click', function (e) {
		if ($(e.target).is('#box-config')) {
			$('#box-config').hide();
			$('#post-content').val('');
			updateNbChars();
		}
	});

	// ===============================================================

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
			} else if (val === "!config") {
				$('#post-content').val('');
				updateNbChars();
				openConfigModal();
			} else {
				writeNewPost(val);
			}
		}
	});

	// Bouton retour en haut de la page
	$(window).scroll(function () {
		if ($(this).scrollTop() > 300) {
			$('#btn-back-to-top').css('display', 'flex');
		} else {
			$('#btn-back-to-top').hide();
		}
	});

	$('#btn-back-to-top').click(function () {
		window.scrollTo({ top: 0, behavior: 'smooth' });
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
