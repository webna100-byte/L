/* ===================== i18n (one language per site) =====================
   Every site runs in exactly ONE language, chosen in Admin > Restaurant
   Settings (settings.lang). There is no language switch for visitors.
   Interface strings live here; restaurant content (names, descriptions,
   page texts...) is plain text in the config, already written in the
   site's language. Older configs that still hold { en, es, ... } objects
   are read with tField(), which picks the site language.
   This file is also imported by the server (order status pushes), so it
   must not touch window/document at load time. */
const SITE_LANGS = {
  en: { name: 'English', locale: 'en-GB' },
  es: { name: 'Español', locale: 'es-ES' },
  fr: { name: 'Français', locale: 'fr-FR' },
  de: { name: 'Deutsch', locale: 'de-DE' },
  it: { name: 'Italiano', locale: 'it-IT' },
  pt: { name: 'Português', locale: 'pt-PT' },
  nl: { name: 'Nederlands', locale: 'nl-NL' },
  ar: { name: 'العربية', locale: 'ar-u-nu-latn', rtl: true }
};

const I18N = {
  en: {
    nav_levels: 'Levels', nav_gifts: 'Gifts', nav_home: 'Home', nav_notifications: 'Alerts', nav_orders: 'My Orders',
    menu: 'Menu', menu_login: 'Sign in', menu_logout: 'Sign out', menu_privacy: 'Privacy Policy', menu_returns: 'Return & Refund Policy',
    cart: 'Cart', back: 'Back', close: 'Close', add_to_cart: 'Add to Cart', item_added: 'Added to cart',
    empty_cart: 'Your cart is empty', go_to_menu: 'Browse the menu', total: 'Total', checkout: 'Checkout', remove: 'Remove',
    notes: 'Notes', notes_ph: 'Optional notes', no_products: 'No products', branches_title: 'Choose a location',
    pickup: 'Pickup', delivery: 'Delivery', name: 'Name', phone: 'Phone number', address: 'Delivery address', zone: 'Delivery area',
    select_zone: 'Select delivery area', order_notes: 'Order notes (optional)', place_order: 'Place Order',
    subtotal: 'Subtotal', invoice_discount: 'Order discount', level_discount: '{level} discount', delivery_fee: 'Delivery',
    delivery_discount: 'Delivery discount', free: 'Free', tax: 'Tax', points_to_earn: 'You will earn {n} points when this order is delivered',
    gift: 'Gift', gifts_in_cart: 'Your gifts', points: 'Your points', pts: 'pts', order_summary: 'Order Summary',
    pickup_info: 'Pickup details', delivery_info: 'Delivery details', only_pickup: 'Pickup is currently the only available option.',
    only_delivery: 'Delivery is currently the only available option.', no_zones: 'No delivery areas are set for this location.',
    minimum_order: 'Minimum delivery order is {amount}', required: 'Please complete the required fields.', phone_invalid: 'Please enter a valid phone number.',
    order_failed: 'We could not send your order. Please try again.', order_sent_title: 'Order received', order_sent_text: 'Your order number is #{n}. You can track it from My Orders.',
    view_my_orders: 'Track my orders', login_required_to_order: 'Sign in to complete your order', sign_in_failed: 'Sign-in failed. Please try again.',
    logout_confirm: 'Sign out? Gifts will be removed from your cart.', logged_out: 'Signed out', logged_in: 'Signed in',
    hello: 'Hi {name}', available_points: 'Available points', lifetime_points: 'Lifetime points', current_level: 'Your level',
    no_level_yet: 'No level reached yet', next_level: '{n} points to reach {level}', max_level: 'You reached the top level',
    level_achieved: 'Achieved', level_current: 'Your current level', level_locked: 'Locked', points_needed: '{n} points to go',
    permanent_discount: '{p}% permanent discount', requires_points: '{n} points', tier_title: '{n}-point gifts', add_gift: 'Redeem',
    gift_added: 'Gift added to your cart', need_more_points: 'You need {n} more points', in_cart: 'In cart',
    reserved_note: 'Gift points are held for this session and only deducted when you place the order.', insufficient_points: 'You do not have enough points for these gifts.',
    view_gifts: 'Gifts', view_levels: 'Levels', points_unit: 'points',
    status_pending: 'Pending', status_preparing: 'Preparing', status_delivered: 'Delivered', status_cancelled: 'Cancelled',
    order_number: 'Order #{n}', points_pending: '+{n} pts on delivery', points_done: '+{n} pts added to your account',
    gift_points_used: '−{n} pts for gifts', gift_points_refunded: '{n} pts returned to your account',
    enable_push: 'Enable notifications', push_enabled: 'Notifications are on for this device', push_blocked: 'Notifications are blocked in your browser settings.',
    push_unsupported: 'This browser does not support notifications.', push_ios_title: 'To get notifications on iPhone',
    push_ios_steps: 'Tap Share, then “Add to Home Screen”. Open the site from the new icon and enable notifications.',
    push_failed: 'Could not enable notifications.', loading: 'Loading…', retry: 'Try again', load_error: 'Could not load the restaurant. Check your internet connection.',
    site_setup: 'This site is being set up', site_not_found: 'This page does not exist.', all_rights: 'All rights reserved', items_count: '{n} items', branch: 'Location',
    product_unavailable: 'An item is no longer available. Please update your cart.', invalid_option: 'An item’s options changed. Please add it again.',
    zone_required: 'Please select a delivery area.', below_minimum: 'Minimum delivery order is {amount}.', empty_cart_err: 'Your cart is empty.',
    invalid_gift: 'A gift is no longer available.', address_required: 'Please enter your delivery address.', name_required: 'Please enter your name.',
    gift_only_note: 'Free gift', open: 'Open', change_branch: 'Change location', see_all: 'See all', minutes_ago: '{n} min ago', hours_ago: '{n} h ago', just_now: 'just now',
    track_order: 'Order status', order_type: 'Order type', type_pickup: 'Pickup', type_delivery: 'Delivery',
    cashier_panel: 'Cashier', cashier_login: 'Cashier sign in', username: 'Username', password: 'Password', login: 'Sign in',
    invalid_login: 'Invalid username or password', too_many_attempts: 'Too many attempts. Please wait and try again.', start_shift: 'Start receiving orders',
    start_shift_note: 'Tap to start so the new-order alarm can play.', tab_new: 'New', tab_preparing: 'Preparing',
    tab_done: 'Delivered', tab_cancelled: 'Cancelled', range_label: 'Show', range_1: 'Today', range_7: 'Last 7 days', range_30: 'Last 30 days', alarm_tap: 'Tap to enable the alarm sound', accept: 'Accept', reject: 'Reject', mark_delivered: 'Delivered', cancel_order: 'Cancel',
    print: 'Print', confirm_reject: 'Reject this order?', confirm_cancel: 'Cancel this order?', no_orders_here: 'No orders here',
    connection_lost: 'Connection lost… retrying', logout: 'Sign out', customer: 'Customer', items: 'Items', gifts_label: 'Gifts',
    new_order_alert: 'New order!', status_updated: 'Status updated', action_failed: 'Action failed', customer_points_spent: 'Cannot reopen: the customer already spent the gift points.',
    receipt_order: 'Order', receipt_date: 'Date', receipt_thanks: 'Thank you for your order', account_disabled: 'This account is disabled',
    rc_phone: 'Phone', rc_address: 'Address', rc_zone: 'Area', rc_level_discount: 'Level discount',
    restaurant_busy: 'The restaurant is busy right now and cannot accept your order.', busy: 'Busy', busy_on: 'Busy mode is on: the website is not accepting new orders', busy_on_toast: 'Orders paused', busy_off_toast: 'Orders resumed',
    push_preparing: 'Your order was accepted and is being prepared.', push_delivered: 'Your order was delivered. Enjoy!',
    push_delivered_points: 'Your order was delivered. {n} points were added to your account.', push_cancelled: 'Your order was cancelled.',
    push_cancelled_refund: 'Your order was cancelled and your gift points were returned.'
  },

  es: {
    nav_levels: 'Niveles', nav_gifts: 'Regalos', nav_home: 'Inicio', nav_notifications: 'Avisos', nav_orders: 'Mis pedidos',
    menu: 'Menú', menu_login: 'Iniciar sesión', menu_logout: 'Cerrar sesión', menu_privacy: 'Política de privacidad', menu_returns: 'Política de devoluciones',
    cart: 'Carrito', back: 'Volver', close: 'Cerrar', add_to_cart: 'Añadir al carrito', item_added: 'Añadido al carrito',
    empty_cart: 'Tu carrito está vacío', go_to_menu: 'Ver la carta', total: 'Total', checkout: 'Finalizar pedido', remove: 'Eliminar',
    notes: 'Notas', notes_ph: 'Notas opcionales', no_products: 'No hay productos', branches_title: 'Elige un local',
    pickup: 'Recoger', delivery: 'A domicilio', name: 'Nombre', phone: 'Teléfono', address: 'Dirección de entrega', zone: 'Zona de entrega',
    select_zone: 'Selecciona la zona de entrega', order_notes: 'Notas del pedido (opcional)', place_order: 'Enviar pedido',
    subtotal: 'Subtotal', invoice_discount: 'Descuento del pedido', level_discount: 'Descuento {level}', delivery_fee: 'Envío',
    delivery_discount: 'Descuento en el envío', free: 'Gratis', tax: 'IVA', points_to_earn: 'Ganarás {n} puntos cuando se entregue este pedido',
    gift: 'Regalo', gifts_in_cart: 'Tus regalos', points: 'Tus puntos', pts: 'pts', order_summary: 'Resumen del pedido',
    pickup_info: 'Datos de recogida', delivery_info: 'Datos de entrega', only_pickup: 'Por ahora solo está disponible la recogida en el local.',
    only_delivery: 'Por ahora solo está disponible la entrega a domicilio.', no_zones: 'Este local no tiene zonas de entrega.',
    minimum_order: 'El pedido mínimo a domicilio es {amount}', required: 'Completa los campos obligatorios.', phone_invalid: 'Introduce un teléfono válido.',
    order_failed: 'No hemos podido enviar tu pedido. Inténtalo de nuevo.', order_sent_title: 'Pedido recibido', order_sent_text: 'Tu número de pedido es #{n}. Puedes seguirlo en Mis pedidos.',
    view_my_orders: 'Seguir mis pedidos', login_required_to_order: 'Inicia sesión para completar tu pedido', sign_in_failed: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    logout_confirm: '¿Cerrar sesión? Los regalos se quitarán de tu carrito.', logged_out: 'Sesión cerrada', logged_in: 'Sesión iniciada',
    hello: 'Hola, {name}', available_points: 'Puntos disponibles', lifetime_points: 'Puntos acumulados', current_level: 'Tu nivel',
    no_level_yet: 'Aún no tienes nivel', next_level: 'Te faltan {n} puntos para {level}', max_level: 'Has alcanzado el nivel máximo',
    level_achieved: 'Conseguido', level_current: 'Tu nivel actual', level_locked: 'Bloqueado', points_needed: 'Faltan {n} puntos',
    permanent_discount: '{p}% de descuento permanente', requires_points: '{n} puntos', tier_title: 'Regalos de {n} puntos', add_gift: 'Canjear',
    gift_added: 'Regalo añadido al carrito', need_more_points: 'Te faltan {n} puntos', in_cart: 'En el carrito',
    reserved_note: 'Los puntos de los regalos se reservan durante esta sesión y solo se descuentan al enviar el pedido.', insufficient_points: 'No tienes puntos suficientes para estos regalos.',
    view_gifts: 'Regalos', view_levels: 'Niveles', points_unit: 'puntos',
    status_pending: 'Pendiente', status_preparing: 'En preparación', status_delivered: 'Entregado', status_cancelled: 'Cancelado',
    order_number: 'Pedido #{n}', points_pending: '+{n} pts al entregar', points_done: '+{n} pts añadidos a tu cuenta',
    gift_points_used: '−{n} pts en regalos', gift_points_refunded: 'Se han devuelto {n} pts a tu cuenta',
    enable_push: 'Activar notificaciones', push_enabled: 'Notificaciones activadas en este dispositivo', push_blocked: 'Las notificaciones están bloqueadas en tu navegador.',
    push_unsupported: 'Este navegador no admite notificaciones.', push_ios_title: 'Para recibir notificaciones en iPhone',
    push_ios_steps: 'Pulsa Compartir y luego «Añadir a pantalla de inicio». Abre la web desde el nuevo icono y activa las notificaciones.',
    push_failed: 'No se pudieron activar las notificaciones.', loading: 'Cargando…', retry: 'Reintentar', load_error: 'No se pudo cargar el restaurante. Revisa tu conexión a internet.',
    site_setup: 'Este sitio se está configurando', site_not_found: 'Esta página no existe.', all_rights: 'Todos los derechos reservados', items_count: '{n} productos', branch: 'Local',
    product_unavailable: 'Un producto ya no está disponible. Actualiza tu carrito.', invalid_option: 'Las opciones de un producto han cambiado. Añádelo de nuevo.',
    zone_required: 'Selecciona una zona de entrega.', below_minimum: 'El pedido mínimo a domicilio es {amount}.', empty_cart_err: 'Tu carrito está vacío.',
    invalid_gift: 'Un regalo ya no está disponible.', address_required: 'Introduce tu dirección de entrega.', name_required: 'Introduce tu nombre.',
    gift_only_note: 'Regalo gratis', open: 'Ver', change_branch: 'Cambiar de local', see_all: 'Ver todo', minutes_ago: 'hace {n} min', hours_ago: 'hace {n} h', just_now: 'ahora',
    track_order: 'Estado del pedido', order_type: 'Tipo de pedido', type_pickup: 'Recogida', type_delivery: 'A domicilio',
    cashier_panel: 'Caja', cashier_login: 'Acceso de caja', username: 'Usuario', password: 'Contraseña', login: 'Entrar',
    invalid_login: 'Usuario o contraseña incorrectos', too_many_attempts: 'Demasiados intentos. Espera un poco y vuelve a intentarlo.', start_shift: 'Empezar a recibir pedidos',
    start_shift_note: 'Pulsa para empezar y que suene el aviso de pedidos nuevos.', tab_new: 'Nuevos', tab_preparing: 'En preparación',
    tab_done: 'Entregados', tab_cancelled: 'Cancelados', range_label: 'Mostrar', range_1: 'Hoy', range_7: 'Últimos 7 días', range_30: 'Últimos 30 días', alarm_tap: 'Toca para activar el sonido de alerta', accept: 'Aceptar', reject: 'Rechazar', mark_delivered: 'Entregado', cancel_order: 'Cancelar',
    print: 'Imprimir', confirm_reject: '¿Rechazar este pedido?', confirm_cancel: '¿Cancelar este pedido?', no_orders_here: 'No hay pedidos',
    connection_lost: 'Conexión perdida… reintentando', logout: 'Salir', customer: 'Cliente', items: 'Productos', gifts_label: 'Regalos',
    new_order_alert: '¡Pedido nuevo!', status_updated: 'Estado actualizado', action_failed: 'No se pudo completar la acción', customer_points_spent: 'No se puede reabrir: el cliente ya gastó los puntos de los regalos.',
    receipt_order: 'Pedido', receipt_date: 'Fecha', receipt_thanks: 'Gracias por tu pedido', account_disabled: 'Esta cuenta está desactivada',
    rc_phone: 'Teléfono', rc_address: 'Dirección', rc_zone: 'Zona', rc_level_discount: 'Descuento de nivel',
    restaurant_busy: 'El restaurante está muy ocupado ahora mismo y no puede aceptar tu pedido.', busy: 'Ocupado', busy_on: 'Modo ocupado activado: la web no acepta pedidos nuevos', busy_on_toast: 'Pedidos en pausa', busy_off_toast: 'Pedidos reanudados',
    push_preparing: 'Tu pedido ha sido aceptado y se está preparando.', push_delivered: 'Tu pedido ha sido entregado. ¡Que aproveche!',
    push_delivered_points: 'Tu pedido ha sido entregado. Se han añadido {n} puntos a tu cuenta.', push_cancelled: 'Tu pedido ha sido cancelado.',
    push_cancelled_refund: 'Tu pedido ha sido cancelado y se han devuelto tus puntos de regalo.'
  },

  fr: {
    nav_levels: 'Niveaux', nav_gifts: 'Cadeaux', nav_home: 'Accueil', nav_notifications: 'Alertes', nav_orders: 'Mes commandes',
    menu: 'Menu', menu_login: 'Se connecter', menu_logout: 'Se déconnecter', menu_privacy: 'Politique de confidentialité', menu_returns: 'Politique de remboursement',
    cart: 'Panier', back: 'Retour', close: 'Fermer', add_to_cart: 'Ajouter au panier', item_added: 'Ajouté au panier',
    empty_cart: 'Votre panier est vide', go_to_menu: 'Voir la carte', total: 'Total', checkout: 'Commander', remove: 'Retirer',
    notes: 'Remarques', notes_ph: 'Remarques facultatives', no_products: 'Aucun produit', branches_title: 'Choisissez un restaurant',
    pickup: 'À emporter', delivery: 'Livraison', name: 'Nom', phone: 'Téléphone', address: 'Adresse de livraison', zone: 'Zone de livraison',
    select_zone: 'Choisissez la zone de livraison', order_notes: 'Remarques sur la commande (facultatif)', place_order: 'Valider la commande',
    subtotal: 'Sous-total', invoice_discount: 'Remise sur la commande', level_discount: 'Remise {level}', delivery_fee: 'Livraison',
    delivery_discount: 'Remise sur la livraison', free: 'Offert', tax: 'TVA', points_to_earn: 'Vous gagnerez {n} points à la livraison de cette commande',
    gift: 'Cadeau', gifts_in_cart: 'Vos cadeaux', points: 'Vos points', pts: 'pts', order_summary: 'Récapitulatif',
    pickup_info: 'Informations de retrait', delivery_info: 'Informations de livraison', only_pickup: 'Seul le retrait sur place est disponible pour le moment.',
    only_delivery: 'Seule la livraison est disponible pour le moment.', no_zones: 'Aucune zone de livraison pour ce restaurant.',
    minimum_order: 'Minimum de commande pour la livraison : {amount}', required: 'Veuillez remplir les champs obligatoires.', phone_invalid: 'Veuillez saisir un numéro de téléphone valide.',
    order_failed: 'Impossible d’envoyer votre commande. Veuillez réessayer.', order_sent_title: 'Commande reçue', order_sent_text: 'Votre numéro de commande est le #{n}. Suivez-la dans Mes commandes.',
    view_my_orders: 'Suivre mes commandes', login_required_to_order: 'Connectez-vous pour finaliser votre commande', sign_in_failed: 'La connexion a échoué. Veuillez réessayer.',
    logout_confirm: 'Se déconnecter ? Les cadeaux seront retirés de votre panier.', logged_out: 'Déconnecté', logged_in: 'Connecté',
    hello: 'Bonjour {name}', available_points: 'Points disponibles', lifetime_points: 'Points cumulés', current_level: 'Votre niveau',
    no_level_yet: 'Aucun niveau atteint', next_level: 'Encore {n} points pour atteindre {level}', max_level: 'Vous avez atteint le niveau maximum',
    level_achieved: 'Atteint', level_current: 'Votre niveau actuel', level_locked: 'Verrouillé', points_needed: 'Encore {n} points',
    permanent_discount: '{p} % de remise permanente', requires_points: '{n} points', tier_title: 'Cadeaux à {n} points', add_gift: 'Échanger',
    gift_added: 'Cadeau ajouté au panier', need_more_points: 'Il vous manque {n} points', in_cart: 'Dans le panier',
    reserved_note: 'Les points des cadeaux sont réservés pour cette session et ne sont déduits qu’à l’envoi de la commande.', insufficient_points: 'Vous n’avez pas assez de points pour ces cadeaux.',
    view_gifts: 'Cadeaux', view_levels: 'Niveaux', points_unit: 'points',
    status_pending: 'En attente', status_preparing: 'En préparation', status_delivered: 'Livrée', status_cancelled: 'Annulée',
    order_number: 'Commande #{n}', points_pending: '+{n} pts à la livraison', points_done: '+{n} pts ajoutés à votre compte',
    gift_points_used: '−{n} pts pour les cadeaux', gift_points_refunded: '{n} pts recrédités sur votre compte',
    enable_push: 'Activer les notifications', push_enabled: 'Notifications activées sur cet appareil', push_blocked: 'Les notifications sont bloquées dans votre navigateur.',
    push_unsupported: 'Ce navigateur ne prend pas en charge les notifications.', push_ios_title: 'Pour recevoir les notifications sur iPhone',
    push_ios_steps: 'Touchez Partager puis « Sur l’écran d’accueil ». Ouvrez le site depuis la nouvelle icône et activez les notifications.',
    push_failed: 'Impossible d’activer les notifications.', loading: 'Chargement…', retry: 'Réessayer', load_error: 'Impossible de charger le restaurant. Vérifiez votre connexion internet.',
    site_setup: 'Ce site est en cours de configuration', site_not_found: 'Cette page n’existe pas.', all_rights: 'Tous droits réservés', items_count: '{n} articles', branch: 'Restaurant',
    product_unavailable: 'Un article n’est plus disponible. Mettez votre panier à jour.', invalid_option: 'Les options d’un article ont changé. Ajoutez-le à nouveau.',
    zone_required: 'Veuillez choisir une zone de livraison.', below_minimum: 'Minimum de commande pour la livraison : {amount}.', empty_cart_err: 'Votre panier est vide.',
    invalid_gift: 'Un cadeau n’est plus disponible.', address_required: 'Veuillez saisir votre adresse de livraison.', name_required: 'Veuillez saisir votre nom.',
    gift_only_note: 'Cadeau offert', open: 'Ouvrir', change_branch: 'Changer de restaurant', see_all: 'Tout voir', minutes_ago: 'il y a {n} min', hours_ago: 'il y a {n} h', just_now: 'à l’instant',
    track_order: 'Statut de la commande', order_type: 'Type de commande', type_pickup: 'À emporter', type_delivery: 'Livraison',
    cashier_panel: 'Caisse', cashier_login: 'Connexion caisse', username: 'Identifiant', password: 'Mot de passe', login: 'Connexion',
    invalid_login: 'Identifiant ou mot de passe incorrect', too_many_attempts: 'Trop de tentatives. Patientez puis réessayez.', start_shift: 'Commencer à recevoir les commandes',
    start_shift_note: 'Touchez pour démarrer afin que l’alarme des nouvelles commandes puisse sonner.', tab_new: 'Nouvelles', tab_preparing: 'En préparation',
    tab_done: 'Livrées', tab_cancelled: 'Annulées', range_label: 'Afficher', range_1: 'Aujourd’hui', range_7: '7 derniers jours', range_30: '30 derniers jours', alarm_tap: 'Touchez pour activer l’alarme sonore', accept: 'Accepter', reject: 'Refuser', mark_delivered: 'Livrée', cancel_order: 'Annuler',
    print: 'Imprimer', confirm_reject: 'Refuser cette commande ?', confirm_cancel: 'Annuler cette commande ?', no_orders_here: 'Aucune commande',
    connection_lost: 'Connexion perdue… nouvelle tentative', logout: 'Déconnexion', customer: 'Client', items: 'Articles', gifts_label: 'Cadeaux',
    new_order_alert: 'Nouvelle commande !', status_updated: 'Statut mis à jour', action_failed: 'L’action a échoué', customer_points_spent: 'Réouverture impossible : le client a déjà dépensé les points des cadeaux.',
    receipt_order: 'Commande', receipt_date: 'Date', receipt_thanks: 'Merci pour votre commande', account_disabled: 'Ce compte est désactivé',
    rc_phone: 'Téléphone', rc_address: 'Adresse', rc_zone: 'Zone', rc_level_discount: 'Remise de niveau',
    restaurant_busy: 'Le restaurant est très occupé et ne peut pas accepter votre commande pour le moment.', busy: 'Occupé', busy_on: 'Mode occupé activé : le site n’accepte pas de nouvelles commandes', busy_on_toast: 'Commandes en pause', busy_off_toast: 'Commandes reprises',
    push_preparing: 'Votre commande a été acceptée et est en préparation.', push_delivered: 'Votre commande a été livrée. Bon appétit !',
    push_delivered_points: 'Votre commande a été livrée. {n} points ont été ajoutés à votre compte.', push_cancelled: 'Votre commande a été annulée.',
    push_cancelled_refund: 'Votre commande a été annulée et vos points cadeaux ont été recrédités.'
  },

  de: {
    nav_levels: 'Stufen', nav_gifts: 'Prämien', nav_home: 'Start', nav_notifications: 'Hinweise', nav_orders: 'Bestellungen',
    menu: 'Menü', menu_login: 'Anmelden', menu_logout: 'Abmelden', menu_privacy: 'Datenschutzerklärung', menu_returns: 'Widerrufs- & Erstattungsrichtlinie',
    cart: 'Warenkorb', back: 'Zurück', close: 'Schließen', add_to_cart: 'In den Warenkorb', item_added: 'Zum Warenkorb hinzugefügt',
    empty_cart: 'Dein Warenkorb ist leer', go_to_menu: 'Zur Speisekarte', total: 'Gesamt', checkout: 'Zur Kasse', remove: 'Entfernen',
    notes: 'Anmerkungen', notes_ph: 'Optionale Anmerkungen', no_products: 'Keine Produkte', branches_title: 'Filiale wählen',
    pickup: 'Abholung', delivery: 'Lieferung', name: 'Name', phone: 'Telefonnummer', address: 'Lieferadresse', zone: 'Liefergebiet',
    select_zone: 'Liefergebiet wählen', order_notes: 'Anmerkungen zur Bestellung (optional)', place_order: 'Bestellung absenden',
    subtotal: 'Zwischensumme', invoice_discount: 'Bestellrabatt', level_discount: '{level}-Rabatt', delivery_fee: 'Lieferung',
    delivery_discount: 'Lieferrabatt', free: 'Gratis', tax: 'MwSt.', points_to_earn: 'Du erhältst {n} Punkte, sobald diese Bestellung geliefert ist',
    gift: 'Prämie', gifts_in_cart: 'Deine Prämien', points: 'Deine Punkte', pts: 'Pkt.', order_summary: 'Bestellübersicht',
    pickup_info: 'Angaben zur Abholung', delivery_info: 'Angaben zur Lieferung', only_pickup: 'Derzeit ist nur Abholung möglich.',
    only_delivery: 'Derzeit ist nur Lieferung möglich.', no_zones: 'Für diese Filiale sind keine Liefergebiete eingerichtet.',
    minimum_order: 'Mindestbestellwert für Lieferung: {amount}', required: 'Bitte fülle die Pflichtfelder aus.', phone_invalid: 'Bitte gib eine gültige Telefonnummer ein.',
    order_failed: 'Deine Bestellung konnte nicht gesendet werden. Bitte versuche es erneut.', order_sent_title: 'Bestellung eingegangen', order_sent_text: 'Deine Bestellnummer ist #{n}. Den Status siehst du unter Bestellungen.',
    view_my_orders: 'Bestellungen verfolgen', login_required_to_order: 'Melde dich an, um deine Bestellung abzuschließen', sign_in_failed: 'Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
    logout_confirm: 'Abmelden? Prämien werden aus deinem Warenkorb entfernt.', logged_out: 'Abgemeldet', logged_in: 'Angemeldet',
    hello: 'Hallo {name}', available_points: 'Verfügbare Punkte', lifetime_points: 'Gesammelte Punkte', current_level: 'Deine Stufe',
    no_level_yet: 'Noch keine Stufe erreicht', next_level: 'Noch {n} Punkte bis {level}', max_level: 'Du hast die höchste Stufe erreicht',
    level_achieved: 'Erreicht', level_current: 'Deine aktuelle Stufe', level_locked: 'Gesperrt', points_needed: 'Noch {n} Punkte',
    permanent_discount: '{p} % Dauerrabatt', requires_points: '{n} Punkte', tier_title: 'Prämien für {n} Punkte', add_gift: 'Einlösen',
    gift_added: 'Prämie zum Warenkorb hinzugefügt', need_more_points: 'Dir fehlen {n} Punkte', in_cart: 'Im Warenkorb',
    reserved_note: 'Die Punkte für Prämien werden für diese Sitzung reserviert und erst beim Absenden der Bestellung abgezogen.', insufficient_points: 'Du hast nicht genug Punkte für diese Prämien.',
    view_gifts: 'Prämien', view_levels: 'Stufen', points_unit: 'Punkte',
    status_pending: 'Ausstehend', status_preparing: 'In Zubereitung', status_delivered: 'Geliefert', status_cancelled: 'Storniert',
    order_number: 'Bestellung #{n}', points_pending: '+{n} Pkt. bei Lieferung', points_done: '+{n} Pkt. gutgeschrieben',
    gift_points_used: '−{n} Pkt. für Prämien', gift_points_refunded: '{n} Pkt. zurückgebucht',
    enable_push: 'Benachrichtigungen aktivieren', push_enabled: 'Benachrichtigungen sind auf diesem Gerät aktiv', push_blocked: 'Benachrichtigungen sind in deinem Browser blockiert.',
    push_unsupported: 'Dieser Browser unterstützt keine Benachrichtigungen.', push_ios_title: 'Benachrichtigungen auf dem iPhone',
    push_ios_steps: 'Tippe auf Teilen und dann auf „Zum Home-Bildschirm“. Öffne die Seite über das neue Symbol und aktiviere die Benachrichtigungen.',
    push_failed: 'Benachrichtigungen konnten nicht aktiviert werden.', loading: 'Wird geladen…', retry: 'Erneut versuchen', load_error: 'Das Restaurant konnte nicht geladen werden. Prüfe deine Internetverbindung.',
    site_setup: 'Diese Seite wird gerade eingerichtet', site_not_found: 'Diese Seite existiert nicht.', all_rights: 'Alle Rechte vorbehalten', items_count: '{n} Artikel', branch: 'Filiale',
    product_unavailable: 'Ein Artikel ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.', invalid_option: 'Die Optionen eines Artikels haben sich geändert. Bitte füge ihn erneut hinzu.',
    zone_required: 'Bitte wähle ein Liefergebiet.', below_minimum: 'Mindestbestellwert für Lieferung: {amount}.', empty_cart_err: 'Dein Warenkorb ist leer.',
    invalid_gift: 'Eine Prämie ist nicht mehr verfügbar.', address_required: 'Bitte gib deine Lieferadresse ein.', name_required: 'Bitte gib deinen Namen ein.',
    gift_only_note: 'Gratis-Prämie', open: 'Öffnen', change_branch: 'Filiale wechseln', see_all: 'Alle ansehen', minutes_ago: 'vor {n} Min.', hours_ago: 'vor {n} Std.', just_now: 'gerade eben',
    track_order: 'Bestellstatus', order_type: 'Bestellart', type_pickup: 'Abholung', type_delivery: 'Lieferung',
    cashier_panel: 'Kasse', cashier_login: 'Kassen-Login', username: 'Benutzername', password: 'Passwort', login: 'Anmelden',
    invalid_login: 'Benutzername oder Passwort falsch', too_many_attempts: 'Zu viele Versuche. Bitte warte kurz.', start_shift: 'Bestellungen empfangen',
    start_shift_note: 'Tippe zum Starten, damit der Alarm für neue Bestellungen ertönen kann.', tab_new: 'Neu', tab_preparing: 'In Zubereitung',
    tab_done: 'Geliefert', tab_cancelled: 'Storniert', range_label: 'Anzeigen', range_1: 'Heute', range_7: 'Letzte 7 Tage', range_30: 'Letzte 30 Tage', alarm_tap: 'Tippen, um den Alarmton zu aktivieren', accept: 'Annehmen', reject: 'Ablehnen', mark_delivered: 'Geliefert', cancel_order: 'Stornieren',
    print: 'Drucken', confirm_reject: 'Diese Bestellung ablehnen?', confirm_cancel: 'Diese Bestellung stornieren?', no_orders_here: 'Keine Bestellungen',
    connection_lost: 'Verbindung verloren… neuer Versuch', logout: 'Abmelden', customer: 'Kunde', items: 'Artikel', gifts_label: 'Prämien',
    new_order_alert: 'Neue Bestellung!', status_updated: 'Status aktualisiert', action_failed: 'Aktion fehlgeschlagen', customer_points_spent: 'Wiederöffnen nicht möglich: Der Kunde hat die Prämienpunkte bereits ausgegeben.',
    receipt_order: 'Bestellung', receipt_date: 'Datum', receipt_thanks: 'Vielen Dank für deine Bestellung', account_disabled: 'Dieses Konto ist deaktiviert',
    rc_phone: 'Telefon', rc_address: 'Adresse', rc_zone: 'Gebiet', rc_level_discount: 'Stufenrabatt',
    restaurant_busy: 'Das Restaurant ist gerade ausgelastet und kann keine Bestellung annehmen.', busy: 'Ausgelastet', busy_on: 'Ausgelastet-Modus aktiv: Die Website nimmt keine neuen Bestellungen an', busy_on_toast: 'Bestellungen pausiert', busy_off_toast: 'Bestellungen wieder aktiv',
    push_preparing: 'Deine Bestellung wurde angenommen und wird zubereitet.', push_delivered: 'Deine Bestellung wurde geliefert. Guten Appetit!',
    push_delivered_points: 'Deine Bestellung wurde geliefert. {n} Punkte wurden gutgeschrieben.', push_cancelled: 'Deine Bestellung wurde storniert.',
    push_cancelled_refund: 'Deine Bestellung wurde storniert und deine Prämienpunkte wurden zurückgebucht.'
  },

  it: {
    nav_levels: 'Livelli', nav_gifts: 'Premi', nav_home: 'Home', nav_notifications: 'Avvisi', nav_orders: 'I miei ordini',
    menu: 'Menu', menu_login: 'Accedi', menu_logout: 'Esci', menu_privacy: 'Informativa sulla privacy', menu_returns: 'Politica di rimborso',
    cart: 'Carrello', back: 'Indietro', close: 'Chiudi', add_to_cart: 'Aggiungi al carrello', item_added: 'Aggiunto al carrello',
    empty_cart: 'Il tuo carrello è vuoto', go_to_menu: 'Sfoglia il menu', total: 'Totale', checkout: 'Concludi ordine', remove: 'Rimuovi',
    notes: 'Note', notes_ph: 'Note facoltative', no_products: 'Nessun prodotto', branches_title: 'Scegli un locale',
    pickup: 'Asporto', delivery: 'Consegna', name: 'Nome', phone: 'Telefono', address: 'Indirizzo di consegna', zone: 'Zona di consegna',
    select_zone: 'Scegli la zona di consegna', order_notes: 'Note sull’ordine (facoltative)', place_order: 'Invia ordine',
    subtotal: 'Subtotale', invoice_discount: 'Sconto ordine', level_discount: 'Sconto {level}', delivery_fee: 'Consegna',
    delivery_discount: 'Sconto consegna', free: 'Gratis', tax: 'IVA', points_to_earn: 'Guadagnerai {n} punti alla consegna di questo ordine',
    gift: 'Premio', gifts_in_cart: 'I tuoi premi', points: 'I tuoi punti', pts: 'pt', order_summary: 'Riepilogo ordine',
    pickup_info: 'Dati per il ritiro', delivery_info: 'Dati per la consegna', only_pickup: 'Al momento è disponibile solo il ritiro in locale.',
    only_delivery: 'Al momento è disponibile solo la consegna.', no_zones: 'Nessuna zona di consegna per questo locale.',
    minimum_order: 'Ordine minimo per la consegna: {amount}', required: 'Compila i campi obbligatori.', phone_invalid: 'Inserisci un numero di telefono valido.',
    order_failed: 'Non è stato possibile inviare l’ordine. Riprova.', order_sent_title: 'Ordine ricevuto', order_sent_text: 'Il tuo numero d’ordine è #{n}. Puoi seguirlo in I miei ordini.',
    view_my_orders: 'Segui i miei ordini', login_required_to_order: 'Accedi per completare l’ordine', sign_in_failed: 'Accesso non riuscito. Riprova.',
    logout_confirm: 'Vuoi uscire? I premi verranno rimossi dal carrello.', logged_out: 'Disconnesso', logged_in: 'Accesso effettuato',
    hello: 'Ciao {name}', available_points: 'Punti disponibili', lifetime_points: 'Punti totali', current_level: 'Il tuo livello',
    no_level_yet: 'Nessun livello raggiunto', next_level: 'Mancano {n} punti per {level}', max_level: 'Hai raggiunto il livello massimo',
    level_achieved: 'Raggiunto', level_current: 'Il tuo livello attuale', level_locked: 'Bloccato', points_needed: 'Mancano {n} punti',
    permanent_discount: 'Sconto permanente del {p}%', requires_points: '{n} punti', tier_title: 'Premi da {n} punti', add_gift: 'Riscatta',
    gift_added: 'Premio aggiunto al carrello', need_more_points: 'Ti mancano {n} punti', in_cart: 'Nel carrello',
    reserved_note: 'I punti dei premi sono riservati per questa sessione e vengono scalati solo all’invio dell’ordine.', insufficient_points: 'Non hai abbastanza punti per questi premi.',
    view_gifts: 'Premi', view_levels: 'Livelli', points_unit: 'punti',
    status_pending: 'In attesa', status_preparing: 'In preparazione', status_delivered: 'Consegnato', status_cancelled: 'Annullato',
    order_number: 'Ordine #{n}', points_pending: '+{n} pt alla consegna', points_done: '+{n} pt aggiunti al tuo account',
    gift_points_used: '−{n} pt per i premi', gift_points_refunded: '{n} pt restituiti al tuo account',
    enable_push: 'Attiva le notifiche', push_enabled: 'Notifiche attive su questo dispositivo', push_blocked: 'Le notifiche sono bloccate nel browser.',
    push_unsupported: 'Questo browser non supporta le notifiche.', push_ios_title: 'Per ricevere notifiche su iPhone',
    push_ios_steps: 'Tocca Condividi e poi «Aggiungi alla schermata Home». Apri il sito dalla nuova icona e attiva le notifiche.',
    push_failed: 'Impossibile attivare le notifiche.', loading: 'Caricamento…', retry: 'Riprova', load_error: 'Impossibile caricare il ristorante. Controlla la connessione.',
    site_setup: 'Questo sito è in fase di configurazione', site_not_found: 'Questa pagina non esiste.', all_rights: 'Tutti i diritti riservati', items_count: '{n} articoli', branch: 'Locale',
    product_unavailable: 'Un prodotto non è più disponibile. Aggiorna il carrello.', invalid_option: 'Le opzioni di un prodotto sono cambiate. Aggiungilo di nuovo.',
    zone_required: 'Scegli una zona di consegna.', below_minimum: 'Ordine minimo per la consegna: {amount}.', empty_cart_err: 'Il tuo carrello è vuoto.',
    invalid_gift: 'Un premio non è più disponibile.', address_required: 'Inserisci l’indirizzo di consegna.', name_required: 'Inserisci il tuo nome.',
    gift_only_note: 'Premio gratuito', open: 'Apri', change_branch: 'Cambia locale', see_all: 'Vedi tutto', minutes_ago: '{n} min fa', hours_ago: '{n} h fa', just_now: 'ora',
    track_order: 'Stato dell’ordine', order_type: 'Tipo di ordine', type_pickup: 'Asporto', type_delivery: 'Consegna',
    cashier_panel: 'Cassa', cashier_login: 'Accesso cassa', username: 'Nome utente', password: 'Password', login: 'Accedi',
    invalid_login: 'Nome utente o password errati', too_many_attempts: 'Troppi tentativi. Attendi e riprova.', start_shift: 'Inizia a ricevere ordini',
    start_shift_note: 'Tocca per iniziare, così l’allarme dei nuovi ordini può suonare.', tab_new: 'Nuovi', tab_preparing: 'In preparazione',
    tab_done: 'Consegnati', tab_cancelled: 'Annullati', range_label: 'Mostra', range_1: 'Oggi', range_7: 'Ultimi 7 giorni', range_30: 'Ultimi 30 giorni', alarm_tap: 'Tocca per attivare il suono di allarme', accept: 'Accetta', reject: 'Rifiuta', mark_delivered: 'Consegnato', cancel_order: 'Annulla',
    print: 'Stampa', confirm_reject: 'Rifiutare questo ordine?', confirm_cancel: 'Annullare questo ordine?', no_orders_here: 'Nessun ordine',
    connection_lost: 'Connessione persa… nuovo tentativo', logout: 'Esci', customer: 'Cliente', items: 'Articoli', gifts_label: 'Premi',
    new_order_alert: 'Nuovo ordine!', status_updated: 'Stato aggiornato', action_failed: 'Operazione non riuscita', customer_points_spent: 'Impossibile riaprire: il cliente ha già speso i punti dei premi.',
    receipt_order: 'Ordine', receipt_date: 'Data', receipt_thanks: 'Grazie per il tuo ordine', account_disabled: 'Questo account è disattivato',
    rc_phone: 'Telefono', rc_address: 'Indirizzo', rc_zone: 'Zona', rc_level_discount: 'Sconto livello',
    restaurant_busy: 'Il ristorante è molto occupato e al momento non può accettare il tuo ordine.', busy: 'Occupato', busy_on: 'Modalità occupato attiva: il sito non accetta nuovi ordini', busy_on_toast: 'Ordini in pausa', busy_off_toast: 'Ordini riattivati',
    push_preparing: 'Il tuo ordine è stato accettato ed è in preparazione.', push_delivered: 'Il tuo ordine è stato consegnato. Buon appetito!',
    push_delivered_points: 'Il tuo ordine è stato consegnato. {n} punti sono stati aggiunti al tuo account.', push_cancelled: 'Il tuo ordine è stato annullato.',
    push_cancelled_refund: 'Il tuo ordine è stato annullato e i punti dei premi ti sono stati restituiti.'
  },

  pt: {
    nav_levels: 'Níveis', nav_gifts: 'Ofertas', nav_home: 'Início', nav_notifications: 'Alertas', nav_orders: 'Pedidos',
    menu: 'Menu', menu_login: 'Iniciar sessão', menu_logout: 'Terminar sessão', menu_privacy: 'Política de privacidade', menu_returns: 'Política de reembolso',
    cart: 'Carrinho', back: 'Voltar', close: 'Fechar', add_to_cart: 'Adicionar ao carrinho', item_added: 'Adicionado ao carrinho',
    empty_cart: 'O seu carrinho está vazio', go_to_menu: 'Ver o menu', total: 'Total', checkout: 'Finalizar pedido', remove: 'Remover',
    notes: 'Notas', notes_ph: 'Notas opcionais', no_products: 'Sem produtos', branches_title: 'Escolha um restaurante',
    pickup: 'Levantamento', delivery: 'Entrega', name: 'Nome', phone: 'Telemóvel', address: 'Morada de entrega', zone: 'Zona de entrega',
    select_zone: 'Escolha a zona de entrega', order_notes: 'Notas do pedido (opcional)', place_order: 'Enviar pedido',
    subtotal: 'Subtotal', invoice_discount: 'Desconto no pedido', level_discount: 'Desconto {level}', delivery_fee: 'Entrega',
    delivery_discount: 'Desconto na entrega', free: 'Grátis', tax: 'IVA', points_to_earn: 'Vai ganhar {n} pontos quando este pedido for entregue',
    gift: 'Oferta', gifts_in_cart: 'As suas ofertas', points: 'Os seus pontos', pts: 'pts', order_summary: 'Resumo do pedido',
    pickup_info: 'Dados de levantamento', delivery_info: 'Dados de entrega', only_pickup: 'De momento só está disponível o levantamento no restaurante.',
    only_delivery: 'De momento só está disponível a entrega.', no_zones: 'Este restaurante não tem zonas de entrega.',
    minimum_order: 'O pedido mínimo para entrega é {amount}', required: 'Preencha os campos obrigatórios.', phone_invalid: 'Introduza um número de telefone válido.',
    order_failed: 'Não foi possível enviar o seu pedido. Tente novamente.', order_sent_title: 'Pedido recebido', order_sent_text: 'O número do seu pedido é #{n}. Pode acompanhá-lo em Pedidos.',
    view_my_orders: 'Acompanhar pedidos', login_required_to_order: 'Inicie sessão para concluir o pedido', sign_in_failed: 'Não foi possível iniciar sessão. Tente novamente.',
    logout_confirm: 'Terminar sessão? As ofertas serão removidas do carrinho.', logged_out: 'Sessão terminada', logged_in: 'Sessão iniciada',
    hello: 'Olá, {name}', available_points: 'Pontos disponíveis', lifetime_points: 'Pontos acumulados', current_level: 'O seu nível',
    no_level_yet: 'Ainda sem nível', next_level: 'Faltam {n} pontos para {level}', max_level: 'Atingiu o nível máximo',
    level_achieved: 'Alcançado', level_current: 'O seu nível atual', level_locked: 'Bloqueado', points_needed: 'Faltam {n} pontos',
    permanent_discount: '{p}% de desconto permanente', requires_points: '{n} pontos', tier_title: 'Ofertas de {n} pontos', add_gift: 'Trocar',
    gift_added: 'Oferta adicionada ao carrinho', need_more_points: 'Faltam-lhe {n} pontos', in_cart: 'No carrinho',
    reserved_note: 'Os pontos das ofertas ficam reservados nesta sessão e só são descontados ao enviar o pedido.', insufficient_points: 'Não tem pontos suficientes para estas ofertas.',
    view_gifts: 'Ofertas', view_levels: 'Níveis', points_unit: 'pontos',
    status_pending: 'Pendente', status_preparing: 'Em preparação', status_delivered: 'Entregue', status_cancelled: 'Cancelado',
    order_number: 'Pedido #{n}', points_pending: '+{n} pts na entrega', points_done: '+{n} pts adicionados à sua conta',
    gift_points_used: '−{n} pts em ofertas', gift_points_refunded: '{n} pts devolvidos à sua conta',
    enable_push: 'Ativar notificações', push_enabled: 'Notificações ativas neste dispositivo', push_blocked: 'As notificações estão bloqueadas no navegador.',
    push_unsupported: 'Este navegador não suporta notificações.', push_ios_title: 'Para receber notificações no iPhone',
    push_ios_steps: 'Toque em Partilhar e depois em «Adicionar ao ecrã principal». Abra o site a partir do novo ícone e ative as notificações.',
    push_failed: 'Não foi possível ativar as notificações.', loading: 'A carregar…', retry: 'Tentar novamente', load_error: 'Não foi possível carregar o restaurante. Verifique a ligação à internet.',
    site_setup: 'Este site está a ser configurado', site_not_found: 'Esta página não existe.', all_rights: 'Todos os direitos reservados', items_count: '{n} artigos', branch: 'Restaurante',
    product_unavailable: 'Um produto já não está disponível. Atualize o carrinho.', invalid_option: 'As opções de um produto mudaram. Adicione-o novamente.',
    zone_required: 'Escolha uma zona de entrega.', below_minimum: 'O pedido mínimo para entrega é {amount}.', empty_cart_err: 'O seu carrinho está vazio.',
    invalid_gift: 'Uma oferta já não está disponível.', address_required: 'Introduza a morada de entrega.', name_required: 'Introduza o seu nome.',
    gift_only_note: 'Oferta grátis', open: 'Abrir', change_branch: 'Mudar de restaurante', see_all: 'Ver tudo', minutes_ago: 'há {n} min', hours_ago: 'há {n} h', just_now: 'agora',
    track_order: 'Estado do pedido', order_type: 'Tipo de pedido', type_pickup: 'Levantamento', type_delivery: 'Entrega',
    cashier_panel: 'Caixa', cashier_login: 'Acesso à caixa', username: 'Utilizador', password: 'Palavra-passe', login: 'Entrar',
    invalid_login: 'Utilizador ou palavra-passe incorretos', too_many_attempts: 'Demasiadas tentativas. Aguarde e tente novamente.', start_shift: 'Começar a receber pedidos',
    start_shift_note: 'Toque para começar, para que o alarme de novos pedidos possa tocar.', tab_new: 'Novos', tab_preparing: 'Em preparação',
    tab_done: 'Entregues', tab_cancelled: 'Cancelados', range_label: 'Mostrar', range_1: 'Hoje', range_7: 'Últimos 7 dias', range_30: 'Últimos 30 dias', alarm_tap: 'Toque para ativar o som de alerta', accept: 'Aceitar', reject: 'Recusar', mark_delivered: 'Entregue', cancel_order: 'Cancelar',
    print: 'Imprimir', confirm_reject: 'Recusar este pedido?', confirm_cancel: 'Cancelar este pedido?', no_orders_here: 'Sem pedidos',
    connection_lost: 'Ligação perdida… a tentar novamente', logout: 'Sair', customer: 'Cliente', items: 'Artigos', gifts_label: 'Ofertas',
    new_order_alert: 'Novo pedido!', status_updated: 'Estado atualizado', action_failed: 'Não foi possível concluir a ação', customer_points_spent: 'Não é possível reabrir: o cliente já gastou os pontos das ofertas.',
    receipt_order: 'Pedido', receipt_date: 'Data', receipt_thanks: 'Obrigado pelo seu pedido', account_disabled: 'Esta conta está desativada',
    rc_phone: 'Telefone', rc_address: 'Morada', rc_zone: 'Zona', rc_level_discount: 'Desconto de nível',
    restaurant_busy: 'O restaurante está muito ocupado e não pode aceitar o seu pedido neste momento.', busy: 'Ocupado', busy_on: 'Modo ocupado ativo: o site não aceita novos pedidos', busy_on_toast: 'Pedidos em pausa', busy_off_toast: 'Pedidos retomados',
    push_preparing: 'O seu pedido foi aceite e está a ser preparado.', push_delivered: 'O seu pedido foi entregue. Bom apetite!',
    push_delivered_points: 'O seu pedido foi entregue. Foram adicionados {n} pontos à sua conta.', push_cancelled: 'O seu pedido foi cancelado.',
    push_cancelled_refund: 'O seu pedido foi cancelado e os seus pontos de ofertas foram devolvidos.'
  },

  nl: {
    nav_levels: 'Niveaus', nav_gifts: 'Cadeaus', nav_home: 'Home', nav_notifications: 'Meldingen', nav_orders: 'Bestellingen',
    menu: 'Menu', menu_login: 'Inloggen', menu_logout: 'Uitloggen', menu_privacy: 'Privacybeleid', menu_returns: 'Retour- en terugbetalingsbeleid',
    cart: 'Winkelmand', back: 'Terug', close: 'Sluiten', add_to_cart: 'In winkelmand', item_added: 'Toegevoegd aan winkelmand',
    empty_cart: 'Je winkelmand is leeg', go_to_menu: 'Bekijk het menu', total: 'Totaal', checkout: 'Afrekenen', remove: 'Verwijderen',
    notes: 'Opmerkingen', notes_ph: 'Optionele opmerkingen', no_products: 'Geen producten', branches_title: 'Kies een vestiging',
    pickup: 'Afhalen', delivery: 'Bezorgen', name: 'Naam', phone: 'Telefoonnummer', address: 'Bezorgadres', zone: 'Bezorggebied',
    select_zone: 'Kies het bezorggebied', order_notes: 'Opmerkingen bij de bestelling (optioneel)', place_order: 'Bestelling plaatsen',
    subtotal: 'Subtotaal', invoice_discount: 'Bestelkorting', level_discount: '{level}-korting', delivery_fee: 'Bezorging',
    delivery_discount: 'Bezorgkorting', free: 'Gratis', tax: 'Btw', points_to_earn: 'Je verdient {n} punten zodra deze bestelling is bezorgd',
    gift: 'Cadeau', gifts_in_cart: 'Jouw cadeaus', points: 'Jouw punten', pts: 'ptn', order_summary: 'Overzicht bestelling',
    pickup_info: 'Gegevens voor afhalen', delivery_info: 'Gegevens voor bezorging', only_pickup: 'Op dit moment is alleen afhalen mogelijk.',
    only_delivery: 'Op dit moment is alleen bezorgen mogelijk.', no_zones: 'Er zijn geen bezorggebieden voor deze vestiging.',
    minimum_order: 'Minimale bestelwaarde voor bezorging: {amount}', required: 'Vul de verplichte velden in.', phone_invalid: 'Vul een geldig telefoonnummer in.',
    order_failed: 'Je bestelling kon niet worden verzonden. Probeer het opnieuw.', order_sent_title: 'Bestelling ontvangen', order_sent_text: 'Je bestelnummer is #{n}. Volg je bestelling bij Bestellingen.',
    view_my_orders: 'Mijn bestellingen volgen', login_required_to_order: 'Log in om je bestelling af te ronden', sign_in_failed: 'Inloggen mislukt. Probeer het opnieuw.',
    logout_confirm: 'Uitloggen? Cadeaus worden uit je winkelmand verwijderd.', logged_out: 'Uitgelogd', logged_in: 'Ingelogd',
    hello: 'Hoi {name}', available_points: 'Beschikbare punten', lifetime_points: 'Totaal verdiende punten', current_level: 'Jouw niveau',
    no_level_yet: 'Nog geen niveau bereikt', next_level: 'Nog {n} punten tot {level}', max_level: 'Je hebt het hoogste niveau bereikt',
    level_achieved: 'Behaald', level_current: 'Je huidige niveau', level_locked: 'Vergrendeld', points_needed: 'Nog {n} punten',
    permanent_discount: '{p}% vaste korting', requires_points: '{n} punten', tier_title: 'Cadeaus voor {n} punten', add_gift: 'Inwisselen',
    gift_added: 'Cadeau toegevoegd aan winkelmand', need_more_points: 'Je hebt nog {n} punten nodig', in_cart: 'In winkelmand',
    reserved_note: 'Punten voor cadeaus worden voor deze sessie gereserveerd en pas afgeschreven als je de bestelling plaatst.', insufficient_points: 'Je hebt niet genoeg punten voor deze cadeaus.',
    view_gifts: 'Cadeaus', view_levels: 'Niveaus', points_unit: 'punten',
    status_pending: 'In afwachting', status_preparing: 'In bereiding', status_delivered: 'Bezorgd', status_cancelled: 'Geannuleerd',
    order_number: 'Bestelling #{n}', points_pending: '+{n} ptn bij bezorging', points_done: '+{n} ptn bijgeschreven',
    gift_points_used: '−{n} ptn voor cadeaus', gift_points_refunded: '{n} ptn teruggestort',
    enable_push: 'Meldingen inschakelen', push_enabled: 'Meldingen staan aan op dit apparaat', push_blocked: 'Meldingen zijn geblokkeerd in je browser.',
    push_unsupported: 'Deze browser ondersteunt geen meldingen.', push_ios_title: 'Meldingen ontvangen op iPhone',
    push_ios_steps: 'Tik op Deel en daarna op ‘Zet op beginscherm’. Open de site via het nieuwe icoon en schakel meldingen in.',
    push_failed: 'Meldingen konden niet worden ingeschakeld.', loading: 'Laden…', retry: 'Opnieuw proberen', load_error: 'Het restaurant kon niet worden geladen. Controleer je internetverbinding.',
    site_setup: 'Deze site wordt ingericht', site_not_found: 'Deze pagina bestaat niet.', all_rights: 'Alle rechten voorbehouden', items_count: '{n} items', branch: 'Vestiging',
    product_unavailable: 'Een product is niet meer beschikbaar. Werk je winkelmand bij.', invalid_option: 'De opties van een product zijn gewijzigd. Voeg het opnieuw toe.',
    zone_required: 'Kies een bezorggebied.', below_minimum: 'Minimale bestelwaarde voor bezorging: {amount}.', empty_cart_err: 'Je winkelmand is leeg.',
    invalid_gift: 'Een cadeau is niet meer beschikbaar.', address_required: 'Vul je bezorgadres in.', name_required: 'Vul je naam in.',
    gift_only_note: 'Gratis cadeau', open: 'Openen', change_branch: 'Andere vestiging', see_all: 'Alles bekijken', minutes_ago: '{n} min geleden', hours_ago: '{n} u geleden', just_now: 'zojuist',
    track_order: 'Status bestelling', order_type: 'Soort bestelling', type_pickup: 'Afhalen', type_delivery: 'Bezorgen',
    cashier_panel: 'Kassa', cashier_login: 'Kassa-login', username: 'Gebruikersnaam', password: 'Wachtwoord', login: 'Inloggen',
    invalid_login: 'Onjuiste gebruikersnaam of wachtwoord', too_many_attempts: 'Te veel pogingen. Wacht even en probeer het opnieuw.', start_shift: 'Bestellingen ontvangen',
    start_shift_note: 'Tik om te starten zodat het alarm voor nieuwe bestellingen kan afgaan.', tab_new: 'Nieuw', tab_preparing: 'In bereiding',
    tab_done: 'Bezorgd', tab_cancelled: 'Geannuleerd', range_label: 'Tonen', range_1: 'Vandaag', range_7: 'Laatste 7 dagen', range_30: 'Laatste 30 dagen', alarm_tap: 'Tik om het alarmgeluid te activeren', accept: 'Accepteren', reject: 'Weigeren', mark_delivered: 'Bezorgd', cancel_order: 'Annuleren',
    print: 'Afdrukken', confirm_reject: 'Deze bestelling weigeren?', confirm_cancel: 'Deze bestelling annuleren?', no_orders_here: 'Geen bestellingen',
    connection_lost: 'Verbinding verbroken… opnieuw proberen', logout: 'Uitloggen', customer: 'Klant', items: 'Items', gifts_label: 'Cadeaus',
    new_order_alert: 'Nieuwe bestelling!', status_updated: 'Status bijgewerkt', action_failed: 'Actie mislukt', customer_points_spent: 'Heropenen kan niet: de klant heeft de cadeaupunten al uitgegeven.',
    receipt_order: 'Bestelling', receipt_date: 'Datum', receipt_thanks: 'Bedankt voor je bestelling', account_disabled: 'Dit account is uitgeschakeld',
    rc_phone: 'Telefoon', rc_address: 'Adres', rc_zone: 'Gebied', rc_level_discount: 'Niveaukorting',
    restaurant_busy: 'Het restaurant is op dit moment te druk en kan je bestelling niet aannemen.', busy: 'Druk', busy_on: 'Drukte-modus aan: de website neemt geen nieuwe bestellingen aan', busy_on_toast: 'Bestellingen gepauzeerd', busy_off_toast: 'Bestellingen hervat',
    push_preparing: 'Je bestelling is geaccepteerd en wordt bereid.', push_delivered: 'Je bestelling is bezorgd. Eet smakelijk!',
    push_delivered_points: 'Je bestelling is bezorgd. Er zijn {n} punten bijgeschreven.', push_cancelled: 'Je bestelling is geannuleerd.',
    push_cancelled_refund: 'Je bestelling is geannuleerd en je cadeaupunten zijn teruggestort.'
  },

  ar: {
    nav_levels: 'المستويات', nav_gifts: 'الهدايا', nav_home: 'الرئيسية', nav_notifications: 'الإشعارات', nav_orders: 'طلباتي',
    menu: 'القائمة', menu_login: 'تسجيل الدخول', menu_logout: 'تسجيل الخروج', menu_privacy: 'سياسة الخصوصية', menu_returns: 'سياسة الإرجاع والاستبدال',
    cart: 'السلة', back: 'رجوع', close: 'إغلاق', add_to_cart: 'أضف إلى السلة', item_added: 'تمت الإضافة إلى السلة',
    empty_cart: 'سلتك فارغة', go_to_menu: 'تصفّح القائمة', total: 'الإجمالي', checkout: 'إتمام الطلب', remove: 'حذف',
    notes: 'ملاحظات', notes_ph: 'ملاحظات اختيارية', no_products: 'لا توجد منتجات', branches_title: 'اختر الفرع',
    pickup: 'استلام', delivery: 'توصيل', name: 'الاسم', phone: 'رقم الجوال', address: 'عنوان التوصيل', zone: 'منطقة التوصيل',
    select_zone: 'اختر منطقة التوصيل', order_notes: 'ملاحظات الطلب (اختياري)', place_order: 'إرسال الطلب',
    subtotal: 'المجموع', invoice_discount: 'خصم الفاتورة', level_discount: 'خصم {level}', delivery_fee: 'التوصيل',
    delivery_discount: 'خصم التوصيل', free: 'مجاني', tax: 'الضريبة', points_to_earn: 'ستكسب {n} نقطة عند تسليم الطلب',
    gift: 'هدية', gifts_in_cart: 'هداياك', points: 'نقاطك', pts: 'نقطة', order_summary: 'ملخص الطلب',
    pickup_info: 'بيانات الاستلام', delivery_info: 'بيانات التوصيل', only_pickup: 'الاستلام من الفرع هو الخيار المتاح حالياً.',
    only_delivery: 'التوصيل هو الخيار المتاح حالياً.', no_zones: 'لا توجد مناطق توصيل لهذا الفرع.',
    minimum_order: 'الحد الأدنى لطلب التوصيل {amount}', required: 'يرجى تعبئة الحقول المطلوبة.', phone_invalid: 'رقم الجوال غير صحيح.',
    order_failed: 'تعذّر إرسال الطلب، حاول مرة أخرى.', order_sent_title: 'تم استلام طلبك', order_sent_text: 'رقم طلبك #{n}. يمكنك متابعة حالته من صفحة طلباتي.',
    view_my_orders: 'متابعة طلباتي', login_required_to_order: 'سجّل الدخول لإتمام طلبك', sign_in_failed: 'تعذّر تسجيل الدخول، حاول مرة أخرى.',
    logout_confirm: 'هل تريد تسجيل الخروج؟ ستُزال الهدايا من سلتك.', logged_out: 'تم تسجيل الخروج', logged_in: 'تم تسجيل الدخول',
    hello: 'أهلاً {name}', available_points: 'رصيدك المتاح', lifetime_points: 'مجموع نقاطك', current_level: 'مستواك',
    no_level_yet: 'لم تصل لأي مستوى بعد', next_level: 'تبقّى {n} نقطة للوصول إلى {level}', max_level: 'وصلت لأعلى مستوى',
    level_achieved: 'محقّق', level_current: 'مستواك الحالي', level_locked: 'مقفل', points_needed: 'تبقّى {n} نقطة',
    permanent_discount: 'خصم دائم {p}%', requires_points: '{n} نقطة', tier_title: 'هدايا {n} نقطة', add_gift: 'استبدال',
    gift_added: 'أُضيفت الهدية إلى سلتك', need_more_points: 'تحتاج {n} نقطة إضافية', in_cart: 'في السلة',
    reserved_note: 'نقاط الهدايا محجوزة لهذه الجلسة وتُخصم نهائياً عند إرسال الطلب.', insufficient_points: 'رصيد نقاطك لا يكفي لهذه الهدايا.',
    view_gifts: 'الهدايا', view_levels: 'المستويات', points_unit: 'نقطة',
    status_pending: 'قيد الانتظار', status_preparing: 'قيد التحضير', status_delivered: 'تم التسليم', status_cancelled: 'ملغي',
    order_number: 'طلب #{n}', points_pending: '+{n} نقطة عند التسليم', points_done: '+{n} نقطة أُضيفت لحسابك',
    gift_points_used: '−{n} نقطة للهدايا', gift_points_refunded: 'أُعيدت {n} نقطة إلى حسابك',
    enable_push: 'تفعيل الإشعارات', push_enabled: 'الإشعارات مفعّلة على هذا الجهاز', push_blocked: 'الإشعارات محظورة من إعدادات المتصفح.',
    push_unsupported: 'هذا المتصفح لا يدعم الإشعارات.', push_ios_title: 'لتلقّي الإشعارات على iPhone',
    push_ios_steps: 'اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح الموقع من الأيقونة الجديدة ثم فعّل الإشعارات.',
    push_failed: 'تعذّر تفعيل الإشعارات.', loading: 'جارٍ التحميل…', retry: 'إعادة المحاولة', load_error: 'تعذّر تحميل بيانات المطعم. تحقّق من اتصالك بالإنترنت.',
    site_setup: 'الموقع قيد الإعداد', site_not_found: 'هذه الصفحة غير موجودة.', all_rights: 'جميع الحقوق محفوظة', items_count: '{n} صنف', branch: 'الفرع',
    product_unavailable: 'أحد المنتجات لم يعد متاحاً، حدّث سلتك.', invalid_option: 'خيارات أحد المنتجات تغيّرت، أعد إضافته.',
    zone_required: 'يرجى اختيار منطقة التوصيل.', below_minimum: 'الحد الأدنى لطلب التوصيل {amount}.', empty_cart_err: 'سلتك فارغة.',
    invalid_gift: 'إحدى الهدايا لم تعد متاحة.', address_required: 'يرجى إدخال عنوان التوصيل.', name_required: 'يرجى إدخال الاسم.',
    gift_only_note: 'هدية مجانية', open: 'عرض', change_branch: 'تغيير الفرع', see_all: 'عرض الكل', minutes_ago: 'منذ {n} د', hours_ago: 'منذ {n} س', just_now: 'الآن',
    track_order: 'حالة الطلب', order_type: 'نوع الطلب', type_pickup: 'استلام من الفرع', type_delivery: 'توصيل',
    cashier_panel: 'لوحة الكاشير', cashier_login: 'دخول الكاشير', username: 'اسم المستخدم', password: 'كلمة المرور', login: 'دخول',
    invalid_login: 'بيانات الدخول غير صحيحة', too_many_attempts: 'محاولات كثيرة، انتظر قليلاً ثم حاول.', start_shift: 'ابدأ استقبال الطلبات',
    start_shift_note: 'اضغط للبدء حتى يعمل التنبيه الصوتي للطلبات الجديدة.', tab_new: 'جديدة', tab_preparing: 'قيد التحضير',
    tab_done: 'تم التسليم', tab_cancelled: 'ملغاة', range_label: 'عرض', range_1: 'اليوم', range_7: 'آخر 7 أيام', range_30: 'آخر 30 يومًا', alarm_tap: 'اضغط لتفعيل صوت التنبيه', accept: 'قبول', reject: 'رفض', mark_delivered: 'تم التسليم', cancel_order: 'إلغاء',
    print: 'طباعة', confirm_reject: 'رفض هذا الطلب؟', confirm_cancel: 'إلغاء هذا الطلب؟', no_orders_here: 'لا توجد طلبات هنا',
    connection_lost: 'انقطع الاتصال… جارٍ إعادة المحاولة', logout: 'خروج', customer: 'الزبون', items: 'الأصناف', gifts_label: 'الهدايا',
    new_order_alert: 'طلب جديد!', status_updated: 'تم تحديث الحالة', action_failed: 'تعذّر تنفيذ العملية', customer_points_spent: 'لا يمكن إعادة فتح الطلب: الزبون صرف نقاط الهدايا.',
    receipt_order: 'طلب', receipt_date: 'التاريخ', receipt_thanks: 'شكراً لطلبكم', account_disabled: 'تم إيقاف هذا الحساب',
    rc_phone: 'الجوال', rc_address: 'العنوان', rc_zone: 'المنطقة', rc_level_discount: 'خصم المستوى',
    restaurant_busy: 'المطعم مشغول حالياً، لا يمكن استقبال طلباتكم الآن.', busy: 'مشغول', busy_on: 'وضع مشغول مفعّل: الموقع لا يستقبل طلبات جديدة', busy_on_toast: 'تم إيقاف استقبال الطلبات', busy_off_toast: 'عاد استقبال الطلبات',
    push_preparing: 'تم قبول طلبك وهو الآن قيد التحضير.', push_delivered: 'تم تسليم طلبك. بالهناء والعافية!',
    push_delivered_points: 'تم تسليم طلبك. أُضيفت {n} نقطة إلى حسابك.', push_cancelled: 'تم إلغاء طلبك.',
    push_cancelled_refund: 'تم إلغاء طلبك وأُعيدت نقاط الهدايا إلى حسابك.'
  }
};

function normLang(lang) { return Object.prototype.hasOwnProperty.call(SITE_LANGS, lang) ? lang : 'en'; }

/* The site language: Admin > Restaurant Settings. Admin pages may force
   their own interface language through window.FORCE_LANG. */
function getLang() {
  if (typeof window !== 'undefined' && window.FORCE_LANG) return normLang(window.FORCE_LANG);
  const s = typeof Store !== 'undefined' && Store.data && Store.data.settings;
  return normLang(s && (s.lang || s.defaultLang));
}

/* Content language: always the site's own language, even inside the admin. */
function contentLang() {
  const s = typeof Store !== 'undefined' && Store.data && Store.data.settings;
  return normLang(s && (s.lang || s.defaultLang));
}

function langLocale(lang) { return SITE_LANGS[normLang(lang || getLang())].locale; }

function translate(lang, key, vars = {}) {
  const dict = I18N[normLang(lang)] || I18N.en;
  const s = dict[key] || I18N.en[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

function t(key, vars = {}) { return translate(getLang(), key, vars); }

/* Content fields are plain strings. Objects ({ en, es, ... }) only appear
   in older configs or the multilingual demo seed: pick the site language,
   then English, then whatever is filled in, so nothing shows up blank. */
function tField(field, lang) {
  if (field == null) return '';
  if (typeof field !== 'object') return String(field);
  lang = lang || contentLang();
  return field[lang] || field.en || Object.values(field).find(v => typeof v === 'string' && v) || '';
}

function applyDocDir() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = SITE_LANGS[lang].rtl ? 'rtl' : 'ltr';
}

/* Turns a multilingual config (the demo seed: every text is
   { en, es, fr, ... }) into a single-language one for `lang`. */
function isLangMap(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length > 0 && keys.every(k => Object.prototype.hasOwnProperty.call(SITE_LANGS, k) && typeof v[k] === 'string');
}
function localizeConfig(v, lang) {
  if (Array.isArray(v)) return v.map(x => localizeConfig(x, lang));
  if (isLangMap(v)) return tField(v, lang);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = localizeConfig(x, lang);
    return out;
  }
  return v;
}

if (typeof globalThis !== 'undefined') Object.assign(globalThis, { SITE_LANGS, I18N_DICT: I18N, translateFor: translate, localizeConfig });
