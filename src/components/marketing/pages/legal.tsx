import { LegalShell } from "@/components/marketing/shell";

const legalRelated = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "CGU", href: "/cgu" },
  { label: "Confidentialité", href: "/politique-confidentialite" },
  { label: "RGPD", href: "/rgpd" },
];

function relatedExcept(href: string) {
  return legalRelated.filter((r) => r.href !== href);
}

export function MentionsLegalesPage() {
  return (
    <LegalShell
      title="Mentions légales"
      updated="17 juillet 2026"
      intro="Informations légales relatives à l’éditeur du site et de l’application InvoicePilot AI, au statut réglementaire du produit et aux conditions d’hébergement. Certains champs d’identité juridique seront complétés avant la mise en production commerciale."
      related={relatedExcept("/mentions-legales")}
      articles={[
        {
          id: "editeur",
          title: "1. Éditeur du site et de l’application",
          body: (
            <>
              <p>
                Le site et l’application InvoicePilot AI sont édités sous la marque{" "}
                <strong>InvoicePilot AI</strong>, logiciel SaaS de conformité à la facturation
                électronique (solution compatible).
              </p>
              <ul className="list-disc space-y-2 ps-6 marker:text-primary">
                <li>
                  Contact éditeur :{" "}
                  <a
                    className="font-medium text-primary underline underline-offset-4"
                    href="mailto:contact@invoicepilot.ai"
                  >
                    contact@invoicepilot.ai
                  </a>
                </li>
                <li>Support produit : contact@invoicepilot.ai (objet « Support »)</li>
                <li>Demandes API / partenariats : contact@invoicepilot.ai (objet dédié)</li>
              </ul>
              <p>
                <strong>À compléter avant mise en production commerciale :</strong> forme sociale,
                capital social, numéro RCS / SIREN de l’éditeur, adresse du siège, nom du directeur
                de la publication, coordonnées de l’hébergeur (raison sociale, adresse, téléphone).
              </p>
            </>
          ),
        },
        {
          id: "statut",
          title: "2. Statut réglementaire du produit",
          body: (
            <>
              <p>
                InvoicePilot AI n’est <strong>pas</strong> une plateforme agréée (PA) au sens de la
                réforme française de la facturation électronique. L’échange légal des factures
                électroniques est assuré exclusivement par la PA immatriculée DGFiP choisie et
                contractée par l’utilisateur.
              </p>
              <p>
                InvoicePilot agit en tant que <strong>solution compatible</strong> : diagnostic de
                préparation à la réforme, contrôles de conformité (mentions, formats structurés),
                score, connecteurs et API d’intégration vers une PA. Le Portail Public de
                Facturation (PPF) demeure l’annuaire et le concentrateur ; il n’offre plus d’échange
                gratuit de factures.
              </p>
              <p>
                InvoicePilot ne fournit pas de conseil fiscal, juridique ou comptable personnalisé.
                Pour une information réglementaire générale hors produit, le numéro national
                d’information reste le <strong>0 806 807 807</strong>.
              </p>
            </>
          ),
        },
        {
          id: "hebergement",
          title: "3. Hébergement",
          body: (
            <>
              <p>
                En phase de développement, l’application peut être servie depuis un environnement
                local ou un hébergeur cloud. Les mentions d’hébergeur (identité, adresse, contact)
                seront publiées ici dès la mise en production.
              </p>
              <p>
                Les données de paiement par carte sont traitées par <strong>Stripe</strong> ;
                InvoicePilot ne stocke pas les numéros de carte (PAN).
              </p>
            </>
          ),
        },
        {
          id: "propriete",
          title: "4. Propriété intellectuelle",
          body: (
            <>
              <p>
                L’ensemble des éléments du site et de l’application — marques, logos, textes,
                interfaces, documentation Mintlify, API, bases de connaissances — est protégé par le
                droit de la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification ou exploitation non autorisée,
                totale ou partielle, est interdite et susceptible de constituer une contrefaçon.
                L’accès au service ne confère aucun droit de propriété sur le logiciel, hors licence
                d’usage prévue aux CGU.
              </p>
            </>
          ),
        },
        {
          id: "responsabilite-contenu",
          title: "5. Limitation — contenus et liens",
          body: (
            <>
              <p>
                Les informations publiées sur le site (guides réforme, blog, documentation) ont une
                vocation informative et produit. Elles peuvent évoluer avec la réglementation et
                l’état du logiciel. Elles ne sauraient engager la responsabilité de l’éditeur au
                titre d’un conseil métier.
              </p>
              <p>
                Les liens vers des sites tiers (documentation Mintlify auto-hébergée, PA, textes
                officiels) sont fournis pour commodité ; InvoicePilot n’exerce aucun contrôle sur
                leur contenu.
              </p>
            </>
          ),
        },
        {
          id: "contact-legal",
          title: "6. Contact",
          body: (
            <p>
              Pour toute question relative aux présentes mentions légales :{" "}
              <a
                className="font-medium text-primary underline underline-offset-4"
                href="mailto:contact@invoicepilot.ai"
              >
                contact@invoicepilot.ai
              </a>
              . Voir également les{" "}
              <a className="font-medium text-primary underline underline-offset-4" href="/cgu">
                CGU
              </a>
              , la{" "}
              <a
                className="font-medium text-primary underline underline-offset-4"
                href="/politique-confidentialite"
              >
                politique de confidentialité
              </a>{" "}
              et la page{" "}
              <a className="font-medium text-primary underline underline-offset-4" href="/rgpd">
                RGPD
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}

export function CguPage() {
  return (
    <LegalShell
      title="Conditions générales d’utilisation"
      updated="17 juillet 2026"
      intro="Les présentes CGU régissent l’accès et l’utilisation du service InvoicePilot AI (application web, API sandbox, documentation). En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes conditions."
      related={relatedExcept("/cgu")}
      articles={[
        {
          id: "objet",
          title: "Article 1 — Objet et définitions",
          body: (
            <>
              <p>
                InvoicePilot AI (« le Service ») fournit un logiciel en mode SaaS permettant le
                diagnostic de préparation à la réforme de la facturation électronique, l’édition et
                la validation de factures électroniques, le score de conformité, des connecteurs
                vers des plateformes agréées, un agent d’assistance réglementaire, et une API de
                conformité (sandbox puis, le cas échéant, production).
              </p>
              <p>
                <strong>« Utilisateur »</strong> désigne toute personne physique ou morale disposant
                d’un compte. <strong>« Organisation »</strong> désigne l’entité (SIREN) rattachée au
                compte. <strong>« PA »</strong> désigne une plateforme agréée immatriculée DGFiP.
              </p>
              <p>
                InvoicePilot n’est pas une PA et n’assure pas l’échange légal des factures à la
                place de l’Utilisateur.
              </p>
            </>
          ),
        },
        {
          id: "acces",
          title: "Article 2 — Accès au service et compte",
          body: (
            <>
              <p>
                L’accès nécessite la création d’un compte, la fourniture d’informations exactes
                (identité, e-mail, données d’organisation dont le SIREN) et l’acceptation des
                présentes CGU ainsi que de la politique de confidentialité.
              </p>
              <p>
                L’Utilisateur est responsable de la confidentialité de ses identifiants, de
                l’activation éventuelle de la double authentification, et de toute activité réalisée
                depuis son compte. Toute utilisation suspecte doit être signalée sans délai à
                contact@invoicepilot.ai.
              </p>
              <p>
                InvoicePilot se réserve le droit de refuser, suspendre ou résilier un compte en cas
                d’informations frauduleuses, d’usage abusif ou de non-paiement.
              </p>
            </>
          ),
        },
        {
          id: "essai",
          title: "Article 3 — Essai, abonnements et paiement",
          body: (
            <>
              <p>
                Un essai Pro d’une durée de quatorze (14) jours peut être proposé sans engagement. À
                l’issue de l’essai, la poursuite du Service peut nécessiter la souscription d’un
                plan (Starter, Pro, Enterprise ou offres cabinets / licences API) et un moyen de
                paiement valide via le prestataire <strong>Stripe</strong>.
              </p>
              <p>
                Les tarifs affichés sur le site sont indicatifs hors taxes sauf mention contraire.
                Les factures d’abonnement sont émises selon les modalités du plan. Tout retard de
                paiement peut entraîner la suspension du Service après notification.
              </p>
              <p>
                Les licences API volume, SLA et environnements production font l’objet de conditions
                particulières ou d’un devis accepté.
              </p>
            </>
          ),
        },
        {
          id: "pa",
          title: "Article 4 — Plateformes agréées et conformité",
          body: (
            <>
              <p>
                L’Utilisateur reste seul responsable du choix, de l’immatriculation, du contrat et
                des obligations liées à sa PA. InvoicePilot ne garantit pas l’acceptation d’une
                facture par une PA tierce, ni la disponibilité continue des réseaux d’échange (PA,
                PPF, annuaire).
              </p>
              <p>
                Les contrôles de conformité fournis par le Service constituent une aide à la
                préparation et à la détection d’erreurs ; ils ne se substituent pas à l’expertise
                fiscale ou comptable de l’Utilisateur ni aux règles d’une PA.
              </p>
            </>
          ),
        },
        {
          id: "api",
          title: "Article 5 — API, sandbox et documentation",
          body: (
            <>
              <p>
                L’API sandbox est fournie à des fins de test et de prototypage. Les appels en mode
                sandbox ne déclenchent aucune transmission réelle vers une PA. La clé de
                démonstration et les endpoints sont décrits dans la documentation développeur
                (Mintlify).
              </p>
              <p>
                L’Utilisateur s’interdit tout usage visant à surcharger, contourner les limites, ou
                extraire massivement des données hors du cadre prévu. InvoicePilot peut révoquer des
                clés, appliquer des quotas ou exiger un contrat éditeur pour la production.
              </p>
            </>
          ),
        },
        {
          id: "obligations",
          title: "Article 6 — Obligations de l’Utilisateur",
          body: (
            <>
              <p>L’Utilisateur s’engage notamment à :</p>
              <ul className="list-disc space-y-2 ps-6 marker:text-primary">
                <li>utiliser le Service conformément à la loi et aux présentes CGU ;</li>
                <li>
                  ne saisir que des données pour lesquelles il dispose des droits et bases légales
                  nécessaires ;
                </li>
                <li>
                  ne pas tenter d’accéder aux données d’autres organisations (isolation
                  multi-tenant) ;
                </li>
                <li>ne pas présenter InvoicePilot comme une plateforme agréée auprès de tiers.</li>
              </ul>
            </>
          ),
        },
        {
          id: "donnees",
          title: "Article 7 — Données personnelles",
          body: (
            <p>
              Le traitement des données personnelles est décrit dans la{" "}
              <a
                className="font-medium text-primary underline underline-offset-4"
                href="/politique-confidentialite"
              >
                politique de confidentialité
              </a>{" "}
              et la page{" "}
              <a className="font-medium text-primary underline underline-offset-4" href="/rgpd">
                RGPD &amp; sous-traitance
              </a>
              . Les données de facturation des clients finaux de l’Utilisateur restent sous la
              responsabilité de ce dernier ; InvoicePilot agit en sous-traitant pour ces données.
            </p>
          ),
        },
        {
          id: "pi",
          title: "Article 8 — Propriété intellectuelle",
          body: (
            <p>
              InvoicePilot conserve tous les droits sur le Service, le code, la documentation et les
              marques. L’Utilisateur dispose d’une licence d’usage non exclusive, non cessible,
              limitée à la durée de l’abonnement. Les contenus saisis par l’Utilisateur (factures,
              clients) demeurent sa propriété ; il concède à InvoicePilot une licence limitée pour
              héberger et traiter ces contenus aux seules fins du Service.
            </p>
          ),
        },
        {
          id: "responsabilite",
          title: "Article 9 — Responsabilité et disponibilité",
          body: (
            <>
              <p>
                Pendant la phase de construction produit, le Service est fourni « en l’état ».
                InvoicePilot s’efforce d’assurer une disponibilité raisonnable sans garantir
                d’absence d’interruption.
              </p>
              <p>
                Dans les limites autorisées par la loi, InvoicePilot ne saurait être tenu
                responsable des dommages indirects, pertes de chiffre d’affaires, pertes de données
                imputables à l’Utilisateur, ou sanctions liées à un défaut de conformité imputable à
                l’Utilisateur, à une PA ou au PPF.
              </p>
              <p>
                La responsabilité totale d’InvoicePilot, tous faits confondus, est limitée, sur les
                douze (12) derniers mois, aux sommes effectivement payées par l’Utilisateur au titre
                du Service (hors taxes), sauf faute lourde ou dol.
              </p>
            </>
          ),
        },
        {
          id: "resiliation",
          title: "Article 10 — Durée et résiliation",
          body: (
            <>
              <p>
                Les présentes CGU s’appliquent dès la création du compte et pour toute la durée
                d’utilisation du Service. L’Utilisateur peut cesser d’utiliser le Service à tout
                moment et demander la clôture de son compte.
              </p>
              <p>
                InvoicePilot peut résilier ou suspendre le Service en cas de manquement grave aux
                CGU, de non-paiement, ou pour motif légitime avec préavis raisonnable lorsque la loi
                l’exige.
              </p>
            </>
          ),
        },
        {
          id: "modifs",
          title: "Article 11 — Modification des CGU",
          body: (
            <p>
              InvoicePilot peut modifier les présentes CGU. La date de mise à jour figure en tête de
              page. En cas de modification substantielle, une information pourra être adressée par
              e-mail ou via l’application. La poursuite de l’utilisation après entrée en vigueur
              vaut acceptation, sous réserve des dispositions impératives applicables.
            </p>
          ),
        },
        {
          id: "droit",
          title: "Article 12 — Droit applicable et litiges",
          body: (
            <p>
              Les présentes CGU sont régies par le droit français. À défaut de résolution amiable,
              tout litige relève des tribunaux compétents du siège de l’éditeur, sous réserve des
              règles d’ordre public applicables aux consommateurs et aux compétences territoriales
              impératives.
            </p>
          ),
        },
      ]}
    />
  );
}

export function ConfidentialitePage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      updated="17 juillet 2026"
      intro="La présente politique décrit comment InvoicePilot AI collecte, utilise et protège les données personnelles dans le cadre du site et du service SaaS, conformément au RGPD et à la loi Informatique et Libertés."
      related={relatedExcept("/politique-confidentialite")}
      articles={[
        {
          id: "responsable",
          title: "1. Responsable de traitement",
          body: (
            <>
              <p>
                Pour les données de compte et d’usage du Service, le responsable de traitement est
                l’éditeur d’InvoicePilot AI (coordonnées : contact@invoicepilot.ai). L’identité
                juridique complète figurera dans les mentions légales dès la production commerciale.
              </p>
              <p>
                Pour les données de facturation et de clients finaux saisies dans le produit, voir
                la page{" "}
                <a className="font-medium text-primary underline underline-offset-4" href="/rgpd">
                  RGPD
                </a>{" "}
                (rôle de sous-traitant).
              </p>
            </>
          ),
        },
        {
          id: "collecte",
          title: "2. Données collectées",
          body: (
            <>
              <p>Nous pouvons collecter les catégories suivantes :</p>
              <ul className="list-disc space-y-2 ps-6 marker:text-primary">
                <li>
                  <strong>Compte :</strong> e-mail, nom, mot de passe hashé, préférences
                </li>
                <li>
                  <strong>Organisation :</strong> SIREN, raison sociale, taille, régime TVA,
                  indicateurs réforme
                </li>
                <li>
                  <strong>Métier :</strong> factures, clients, scores et journaux de conformité
                </li>
                <li>
                  <strong>Sécurité :</strong> logs de connexion, événements 2FA, adresses IP
                  techniques
                </li>
                <li>
                  <strong>Paiement :</strong> données traitées par Stripe (nous ne stockons pas le
                  PAN)
                </li>
                <li>
                  <strong>Contact marketing :</strong> messages envoyés via le formulaire Contact
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "finalites",
          title: "3. Finalités et bases légales",
          body: (
            <>
              <ul className="list-disc space-y-2 ps-6 marker:text-primary">
                <li>
                  <strong>Exécution du contrat :</strong> fourniture du SaaS, support, facturation
                  d’abonnement
                </li>
                <li>
                  <strong>Intérêt légitime :</strong> sécurité, prévention de la fraude,
                  amélioration du produit, statistiques agrégées
                </li>
                <li>
                  <strong>Obligation légale :</strong> conservation comptable des factures
                  d’abonnement le cas échéant
                </li>
                <li>
                  <strong>Consentement :</strong> lorsque requis (cookies non essentiels — à
                  préciser en production avec bandeau conforme)
                </li>
              </ul>
              <p className="mt-4">
                Nous ne revendons pas vos données à des tiers à des fins publicitaires.
              </p>
            </>
          ),
        },
        {
          id: "destinataires",
          title: "4. Destinataires et sous-traitants",
          body: (
            <p>
              Accès limité aux équipes habilitées d’InvoicePilot. Sous-traitants susceptibles
              d’intervenir : hébergement cloud, e-mail transactionnel, Stripe (paiement), outils
              d’observabilité. La liste nominative sera publiée avant la production commerciale. Des
              transferts hors UE, le cas échéant, s’appuieront sur des garanties appropriées
              (clauses types, etc.).
            </p>
          ),
        },
        {
          id: "durees",
          title: "5. Durées de conservation",
          body: (
            <ul className="list-disc space-y-2 ps-6 marker:text-primary">
              <li>
                Compte et organisation : durée de la relation puis suppression ou anonymisation
              </li>
              <li>Journaux de sécurité : durée nécessaire à la détection d’incidents</li>
              <li>
                Données métier (factures clients) : selon vos instructions et obligations ;
                suppression sur demande de clôture sous réserve d’obligations légales
              </li>
              <li>Messages Contact : traitement puis archivage limité du suivi commercial</li>
            </ul>
          ),
        },
        {
          id: "droits",
          title: "6. Vos droits",
          body: (
            <>
              <p>
                Conformément au RGPD, vous disposez des droits d’accès, de rectification,
                d’effacement, de limitation, de portabilité, d’opposition, et du droit de retirer un
                consentement.
              </p>
              <p>
                Exercice des droits :{" "}
                <a
                  className="font-medium text-primary underline underline-offset-4"
                  href="mailto:contact@invoicepilot.ai"
                >
                  contact@invoicepilot.ai
                </a>{" "}
                (objet « RGPD »). Vous pouvez également introduire une réclamation auprès de la{" "}
                <strong>CNIL</strong> (www.cnil.fr).
              </p>
            </>
          ),
        },
        {
          id: "securite",
          title: "7. Sécurité",
          body: (
            <p>
              Mesures mises en œuvre notamment : authentification de session, 2FA e-mail, isolation
              multi-tenant par organisation, clés API, journaux d’activité, chiffrement en transit
              (HTTPS) en production. Aucun système n’étant infaillible, signalez tout incident
              suspect à contact@invoicepilot.ai.
            </p>
          ),
        },
        {
          id: "mineurs",
          title: "8. Mineurs",
          body: (
            <p>
              Le Service s’adresse à des professionnels. Il n’est pas destiné aux mineurs de moins
              de 15 ans.
            </p>
          ),
        },
        {
          id: "modifs-privacy",
          title: "9. Modifications",
          body: (
            <p>
              La présente politique peut être mise à jour. La date en tête de page fait foi. En cas
              de changement substantiel, une information pourra être communiquée via le Service ou
              par e-mail.
            </p>
          ),
        },
      ]}
    />
  );
}

export function RgpdPage() {
  return (
    <LegalShell
      title="RGPD & sous-traitance"
      updated="17 juillet 2026"
      intro="Répartition des rôles (responsable / sous-traitant), mesures techniques et organisationnelles, et modalités d’obtention d’un accord de sous-traitance (DPA) pour cabinets et éditeurs."
      related={relatedExcept("/rgpd")}
      articles={[
        {
          id: "roles",
          title: "1. Répartition des rôles",
          body: (
            <>
              <p>
                <strong>Données de compte et d’administration InvoicePilot</strong> (identité de
                connexion, facturation d’abonnement, logs produit) : InvoicePilot agit en{" "}
                <strong>responsable de traitement</strong>.
              </p>
              <p>
                <strong>Données de facturation électronique et de clients finaux</strong> saisies ou
                synchronisées dans le Service : l’Utilisateur / l’Organisation est{" "}
                <strong>responsable de traitement</strong> ; InvoicePilot agit en{" "}
                <strong>sous-traitant</strong> au sens de l’article 28 du RGPD, pour la durée du
                contrat et selon les instructions documentées dans le produit.
              </p>
            </>
          ),
        },
        {
          id: "instructions",
          title: "2. Instructions du responsable",
          body: (
            <p>
              Le sous-traitant ne traite les données métier que pour fournir le Service
              (hébergement, validation, affichage, export, connecteurs, API selon le plan). Toute
              instruction incompatible avec le Service ou illicite pourra être refusée avec
              motivation.
            </p>
          ),
        },
        {
          id: "mesures",
          title: "3. Mesures de sécurité",
          body: (
            <ul className="list-disc space-y-2 ps-6 marker:text-primary">
              <li>Contrôle d’accès et authentification (session, 2FA e-mail)</li>
              <li>Isolation logique multi-tenant par organisation (SIREN)</li>
              <li>Clés API et journalisation des actions sensibles</li>
              <li>Chiffrement des flux (TLS) en production</li>
              <li>Politique de moindre privilège pour le personnel habilité</li>
              <li>Procédure de notification d’incident de sécurité</li>
            </ul>
          ),
        },
        {
          id: "sous-traitants",
          title: "4. Sous-traitants ultérieurs",
          body: (
            <p>
              InvoicePilot peut recourir à des sous-traitants ultérieurs (hébergement, e-mail,
              paiement Stripe, monitoring). Une information sera fournie avant tout changement
              substantiel lorsque le DPA l’exige. Les sous-traitants sont tenus à des obligations de
              protection équivalentes.
            </p>
          ),
        },
        {
          id: "assistance",
          title: "5. Assistance aux droits des personnes",
          body: (
            <p>
              InvoicePilot assiste le responsable (cabinet, entreprise, éditeur) pour répondre aux
              demandes d’exercice des droits portant sur les données hébergées dans le Service, dans
              la mesure des moyens techniques du produit et dans des délais raisonnables.
            </p>
          ),
        },
        {
          id: "incidents",
          title: "6. Notification d’incidents",
          body: (
            <p>
              En cas de violation de données personnelles affectant les données traitées pour le
              compte du responsable, InvoicePilot s’engage à informer le responsable dans les
              meilleurs délais après en avoir pris connaissance, avec les éléments utiles à
              l’évaluation et à la notification éventuelle à l’autorité et aux personnes.
            </p>
          ),
        },
        {
          id: "dpa",
          title: "7. Accord de sous-traitance (DPA)",
          body: (
            <>
              <p>
                Un DPA détaillé (instructions, localisation, sous-traitants, audits, sort des
                données en fin de contrat) est disponible pour les cabinets, ETI et éditeurs sur
                demande.
              </p>
              <p>
                Demande :{" "}
                <a
                  className="font-medium text-primary underline underline-offset-4"
                  href="/contact"
                >
                  page Contact
                </a>{" "}
                ou e-mail contact@invoicepilot.ai (objet « DPA »).
              </p>
            </>
          ),
        },
        {
          id: "fin",
          title: "8. Fin de contrat et sort des données",
          body: (
            <p>
              À la fin du contrat, selon les options du produit et du DPA : restitution exportable
              des données métier puis suppression ou anonymisation dans un délai raisonnable, sauf
              obligation légale de conservation (ex. factures d’abonnement InvoicePilot).
            </p>
          ),
        },
        {
          id: "contact-dpo",
          title: "9. Contact",
          body: (
            <p>
              Demandes RGPD : contact@invoicepilot.ai. Un délégué à la protection des données (DPO)
              sera désigné et publié ici lorsque l’organisation de production l’exigera.
            </p>
          ),
        },
      ]}
    />
  );
}
