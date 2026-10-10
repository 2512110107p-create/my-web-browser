


import "./style.css";

const Cesium = window.Cesium;

// 現在の表示言語
let currentLanguage = "ja";
let selectedShelter = null;
let floodDataSource = null;

// HTMLの要素
const shelterNameElement = document.getElementById("shelterName");
const shelterAddressElement = document.getElementById("shelterAddress");
const shelterCategoryElement = document.getElementById("shelterCategory");
const shelterHazardsElement = document.getElementById("shelterHazards");
const languageButton = document.getElementById("languageButton");
const floodToggle = document.getElementById("floodToggle");

// 表示言語ごとの文章
const translations = {
  ja: {
    languageButton: "English",
    shelterTitle: "避難場所の情報",
    shelterInstruction: "地図上のマーカーをクリックしてください。",
    address: "住所：",
    category: "施設区分：",
    hazards: "対応する災害：",
    unknown: "データ未登録",
    noHazards: "データ未登録",
    appTitle: "避難所ガチャ：3D京都セーフティナビ",
    description: "京都駅周辺の3D都市モデルを表示する",
    floodLabel: " 洪水ハザードを表示",
  },
  en: {
    languageButton: "日本語",
    shelterTitle: "Shelter Information",
    shelterInstruction: "Click a marker on the map.",
    address: "Address: ",
    category: "Facility type: ",
    hazards: "Supported hazards: ",
    unknown: "Not available",
    noHazards: "Not available",
    appTitle: "3D Kyoto Safety Navigator",
    description: "3D city model around Kyoto Station",
    floodLabel: " Show flood hazard",
  },
};

// 施設区分の英訳
const categoryTranslations = {
  "指定避難所等": "Designated Evacuation Shelter",
};

// 災害の種類の英訳
const hazardTranslations = {
  "水災害": "Flooding",
  "土砂災害": "Landslide",
  "地震": "Earthquake",
  "津波": "Tsunami",
  "大規模な火事": "Large-scale Fire",
  "火災": "Fire",
};

function translateCategory(category) {
  return categoryTranslations[category] || category;
}

function translateHazards(hazards) {
  return hazards.map(
    (hazard) => hazardTranslations[hazard] || hazard
  );
}

// 3D地図を作成
const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayer: new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({
      url: "https://tile.openstreetmap.org/",
    })
  ),
  animation: false,
  timeline: false,
  geocoder: false,
  baseLayerPicker: false,
  homeButton: true,
  sceneModePicker: false,
  navigationHelpButton: false,
  infoBox: false,
  selectionIndicator: false,
});

// 最初に表示する場所を京都駅周辺に設定
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    135.7588,
    34.9855,
    1800
  ),
  orientation: {
    heading: 0,
    pitch: Cesium.Math.toRadians(-45),
    roll: 0,
  },
  duration: 2,
});

// PLATEAUの3D都市モデルを読み込む
async function loadPlateauBuildings() {
  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(
      "https://api.plateauview.mlit.go.jp/datacatalog/3dtiles/26100-bldg-lod1-latest/tileset.json"
    );

    viewer.scene.primitives.add(tileset);
    console.log("PLATEAUの建物モデルを読み込みました");
  } catch (error) {
    console.error("PLATEAUの読み込みに失敗しました:", error);
  }
}

loadPlateauBuildings();

// 避難所情報を表示
function showShelterInfo(entity) {
  selectedShelter = entity;

  const properties = entity.properties;

  function getValue(property) {
    return property ? property.getValue() : undefined;
  }

  const nameJa = getValue(properties.name) || "名称不明";
  const nameEn = getValue(properties.nameEn) || "";
  const addressJa = getValue(properties.address) || "";
  const addressEn = getValue(properties.addressEn) || "";
  const categoryJa = getValue(properties.category) || "";
  const hazardsJa = getValue(properties.hazardTypes) || [];

  const t = translations[currentLanguage];

  const name =
    currentLanguage === "en" && nameEn ? nameEn : nameJa;

  const address =
    currentLanguage === "en" && addressEn ? addressEn : addressJa;

  const category =
    currentLanguage === "en"
      ? translateCategory(categoryJa)
      : categoryJa;

  const hazards =
    currentLanguage === "en"
      ? translateHazards(hazardsJa)
      : hazardsJa;

  shelterNameElement.textContent = name;
  shelterAddressElement.textContent =
    t.address + (address || t.unknown);
  shelterCategoryElement.textContent =
    t.category + (category || t.unknown);
  shelterHazardsElement.textContent =
    t.hazards +
    (hazards.length > 0
      ? hazards.join(currentLanguage === "en" ? ", " : "、")
      : t.noHazards);
}

// 避難所データを読み込んで地図に表示
async function loadShelters() {
  try {
    const response = await fetch("/data/shelters.json");

    if (!response.ok) {
      throw new Error(
        `避難所データの読み込みに失敗しました: ${response.status}`
      );
    }

    const shelters = await response.json();

    shelters.forEach((shelter) => {
      const entity = viewer.entities.add({
        id: String(shelter.id),

        position: Cesium.Cartesian3.fromDegrees(
          Number(shelter.longitude),
          Number(shelter.latitude)
        ),

        point: {
          pixelSize: 14,
          color: Cesium.Color.CYAN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },

        label: {
          text:
            currentLanguage === "en" && shelter.nameEn
              ? shelter.nameEn
              : shelter.name || "名称不明",
          font: "14px sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },

        properties: {
          isShelter: true,
          name: shelter.name || "名称不明",
          nameEn: shelter.nameEn || "",
          address: shelter.address || "",
          addressEn: shelter.addressEn || "",
          category: shelter.category || "",
          hazardTypes: Array.isArray(shelter.hazardTypes)
            ? shelter.hazardTypes
            : [],
        },
      });

      // 念のためマーカーの施設情報を保持
      entity.properties.isShelter = true;
    });

    console.log(`${shelters.length}件の地点を表示しました`);
  } catch (error) {
    console.error("避難所表示エラー:", error);
  }
}

loadShelters();

// 地図上のクリックを検知
const clickHandler = new Cesium.ScreenSpaceEventHandler(
  viewer.scene.canvas
);

clickHandler.setInputAction((event) => {
  const pickedObject = viewer.scene.pick(event.position);

  if (
    !Cesium.defined(pickedObject) ||
    !Cesium.defined(pickedObject.id)
  ) {
    return;
  }

  const entity = pickedObject.id;

  if (
    !entity.properties ||
    !entity.properties.isShelter ||
    !entity.properties.isShelter.getValue()
  ) {
    return;
  }

  showShelterInfo(entity);
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

// 洪水ハザードデータを読み込む
async function loadFloodHazard() {
  try {
    floodDataSource = await Cesium.GeoJsonDataSource.load(
      "/hazard/kyoto_station_flood_hazard.geojson",
      {
        clampToGround: true,
        stroke: Cesium.Color.ORANGE,
        strokeWidth: 1,
        fill: Cesium.Color.ORANGE.withAlpha(0.30),
      }
    );

    viewer.dataSources.add(floodDataSource);

    floodDataSource.entities.values.forEach((entity) => {
      if (entity.polygon) {
        entity.polygon.material =
          Cesium.Color.ORANGE.withAlpha(0.30);
        entity.polygon.outline = true;
        entity.polygon.outlineColor =
          Cesium.Color.ORANGE.withAlpha(0.8);
        entity.polygon.height = 0;
      }
    });

    floodDataSource.show = floodToggle.checked;

    console.log(
      `洪水区域を読み込みました: ${floodDataSource.entities.values.length}件`
    );
  } catch (error) {
    console.error("洪水ハザードの読み込みに失敗しました:", error);
  }
}

floodToggle.addEventListener("change", () => {
  if (floodDataSource) {
    floodDataSource.show = floodToggle.checked;
  }
});

loadFloodHazard();

// 言語切り替え時に画面を更新
function updateLanguage() {
  const t = translations[currentLanguage];

  document.documentElement.lang = currentLanguage;
  languageButton.textContent = t.languageButton;
  document.title = t.appTitle;

  const headerTitle = document.querySelector("header h1");
  if (headerTitle) {
    headerTitle.textContent = t.appTitle;
  }

  const headerDescription = document.querySelector("header p");
  if (headerDescription) {
    headerDescription.textContent = t.description;
  }

  const floodLabel = floodToggle.parentElement;
  if (floodLabel) {
    floodLabel.lastChild.textContent = t.floodLabel;
  }

  if (selectedShelter) {
    showShelterInfo(selectedShelter);
  } else {
    shelterNameElement.textContent = t.shelterTitle;
    shelterAddressElement.textContent = t.shelterInstruction;
    shelterCategoryElement.textContent = "";
    shelterHazardsElement.textContent = "";
  }

  viewer.entities.values.forEach((entity) => {
    if (!entity.properties || !entity.properties.isShelter) {
      return;
    }

    const nameJa = entity.properties.name.getValue();
    const nameEn = entity.properties.nameEn.getValue();

    entity.label.text =
      currentLanguage === "en" && nameEn ? nameEn : nameJa;
  });
}

// 言語切り替えボタン
languageButton.addEventListener("click", () => {
  currentLanguage = currentLanguage === "ja" ? "en" : "ja";
  updateLanguage();
});




