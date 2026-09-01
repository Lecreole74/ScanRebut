function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Test caméra")
    .setXFrameOptionsMode(
  HtmlService.XFrameOptionsMode.ALLOWALL
);
}