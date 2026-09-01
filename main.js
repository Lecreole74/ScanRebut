/**
 * ScanRebut — Web App de contrôle par scan de codes DataMatrix.
 *
 * Format attendu du code-barres : reference-date-code_defaut-numero_unique
 * Exemple : EF4052C-20260903-280012-192327098
 *
 * L'utilisateur saisit la référence en cours, scanne en continu les
 * codes DataMatrix des pièces rebutées : OK si le code est lisible et
 * correspond à la référence en cours et n'a pas déjà été scanné dans la
 * session, NOK sinon (référence différente ou doublon). À la validation,
 * un fichier JSON récapitulatif (tri par code défaut) est créé sur le
 * Drive de l'utilisateur.
 */

function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('ScanRebut')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Enregistre une session de scan terminée : construit le tri par code
 * défaut et sauvegarde un fichier JSON sur le Drive de l'utilisateur.
 *
 * @param {string} reference Référence en cours de contrôle.
 * @param {Array<Object>} scans Scans validés OK de la session, chacun
 *   sous la forme {codeBarre, reference, date, codeDefaut, numeroUnique, timestamp}.
 * @return {Object} Résumé {fileName, fileUrl, fileId, total, tri}.
 */
function saveSession(reference, scans) {
  reference = String(reference || '').trim();
  scans = Array.isArray(scans) ? scans : [];

  var tri = {};
  scans.forEach(function (s) {
    var code = String((s && s.codeDefaut) || 'INCONNU');
    tri[code] = (tri[code] || 0) + 1;
  });

  var tz = Session.getScriptTimeZone();
  var horodatage = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
  var nomFichier = 'Rebuts_' + (reference || 'SANS_REF') + '_' + horodatage + '.json';

  var payload = {
    reference: reference,
    dateGeneration: new Date().toISOString(),
    total: scans.length,
    triParCodeDefaut: tri,
    detail: scans
  };

  var blob = Utilities.newBlob(
    JSON.stringify(payload, null, 2),
    'application/json',
    nomFichier
  );
  var fichier = DriveApp.createFile(blob);

  return {
    fileName: nomFichier,
    fileUrl: fichier.getUrl(),
    fileId: fichier.getId(),
    total: scans.length,
    tri: tri
  };
}
