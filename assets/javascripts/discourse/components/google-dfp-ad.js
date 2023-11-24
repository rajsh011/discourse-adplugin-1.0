import AdComponent from "discourse/plugins/discourse-adplugin/discourse/components/ad-component";
import discourseComputed, { on } from "discourse-common/utils/decorators";
import loadScript from "discourse/lib/load-script";
import { alias } from "@ember/object/computed";
import RSVP from "rsvp";
import { isTesting } from "discourse-common/config/environment";
import { htmlSafe } from "@ember/template";

let _didnaLoaded  = false,
_didnaPromise  = null,
  ads = {},
  nextSlotNum = 1,
  renderCounts = {};

function getNextSlotNum() {
  return nextSlotNum++;
}

function splitWidthInt(value) {
  let str = value.substring(0, 3);
  return str.trim();
}

function splitHeightInt(value) {
  let str = value.substring(4, 7);
  return str.trim();
}

// This creates an array for the values of the custom targeting key
function valueParse(value) {
  let final = value.replace(/ /g, "");
  final = final.replace(/['"]+/g, "");
  final = final.split(",");
  return final;
}

// This creates an array for the key of the custom targeting key
function keyParse(word) {
  let key = word;
  key = key.replace(/['"]+/g, "");
  key = key.split("\n");
  return key;
}

// This should call adslot.setTargeting(key for that location, value for that location)
/* Comment yg cdfsn */
/* function custom_targeting(key_array, value_array, adSlot) {
  for (let i = 0; i < key_array.length; i++) {
    if (key_array[i]) {
      adSlot.setTargeting(key_array[i], valueParse(value_array[i]));
    }
  }
}
 */
const DESKTOP_SETTINGS = {
  "topic-list-top": {
    code: "dfp_topic_list_top_code",
    sizes: "dfp_topic_list_top_ad_sizes",
    targeting_keys: "dfp_target_topic_list_top_key_code",
    targeting_values: "dfp_target_topic_list_top_value_code",
  },
  "topic-above-post-stream": {
    code: "dfp_topic_above_post_stream_code",
    sizes: "dfp_topic_above_post_stream_ad_sizes",
    targeting_keys: "dfp_target_topic_above_post_stream_key_code",
    targeting_values: "dfp_target_topic_above_post_stream_value_code",
  },
  "topic-above-suggested": {
    code: "dfp_topic_above_suggested_code",
    sizes: "dfp_topic_above_suggested_ad_sizes",
    targeting_keys: "dfp_target_topic_above_suggested_key_code",
    targeting_values: "dfp_target_topic_above_suggested_value_code",
  },
  "post-bottom": {
    code: "dfp_post_bottom_code",
    sizes: "dfp_post_bottom_ad_sizes",
    targeting_keys: "dfp_target_post_bottom_key_code",
    targeting_values: "dfp_target_post_bottom_value_code",
  },
  "side-ad":{	
    code: "dfp_side_ad_code",	
    sizes: "dfp_mobile_side_ad_sizes",	
    targeting_keys: "dfp_target_side_ad_key_code",	
    targeting_values: "dfp_target_side_ad_value_code",	
  },
};

const MOBILE_SETTINGS = {
  "topic-list-top": {
    code: "dfp_mobile_topic_list_top_code",
    sizes: "dfp_mobile_topic_list_top_ad_sizes",
    targeting_keys: "dfp_target_topic_list_top_key_code",
    targeting_values: "dfp_target_topic_list_top_value_code",
  },
  "topic-above-post-stream": {
    code: "dfp_mobile_topic_above_post_stream_code",
    sizes: "dfp_mobile_topic_above_post_stream_ad_sizes",
    targeting_keys: "dfp_target_topic_above_post_stream_key_code",
    targeting_values: "dfp_target_topic_above_post_stream_value_code",
  },
  "topic-above-suggested": {
    code: "dfp_mobile_topic_above_suggested_code",
    sizes: "dfp_mobile_topic_above_suggested_ad_sizes",
    targeting_keys: "dfp_target_topic_above_suggested_key_code",
    targeting_values: "dfp_target_topic_above_suggested_value_code",
  },
  "post-bottom": {
    code: "dfp_mobile_post_bottom_code",
    sizes: "dfp_mobile_post_bottom_ad_sizes",
    targeting_keys: "dfp_target_post_bottom_key_code",
    targeting_values: "dfp_target_post_bottom_value_code",
  },
  "side-ad":{	
    code: "dfp_mobile_side_ad_code",	
    sizes: "dfp_mobile_side_ad_sizes",	
    targeting_keys: "dfp_target_side_ad_key_code",	
    targeting_values: "dfp_target_side_ad_value_code",	
  },
};

function getWidthAndHeight(placement, settings, isMobile) {
  let config, size;

  if (isMobile) {
    config = MOBILE_SETTINGS[placement];
  } else {
    config = DESKTOP_SETTINGS[placement];
  }

  if (!renderCounts[placement]) {
    renderCounts[placement] = 0;
  }

  const sizes = (settings[config.sizes] || "").split("|");

  if (sizes.length === 1) {
    size = sizes[0];
  } else {
    size = sizes[renderCounts[placement] % sizes.length];
    renderCounts[placement] += 1;
  }

  if (size === "fluid") {
    return { width: "fluid", height: "fluid" };
  }

  const sizeObj = {
    width: parseInt(splitWidthInt(size), 10),
    height: parseInt(splitHeightInt(size), 10),
  };

  if (!isNaN(sizeObj.width) && !isNaN(sizeObj.height)) {
    return sizeObj;
  }
}
/* Comment yg cdfsn */
/* function defineSlot(
  divId,
  placement,
  settings,
  isMobile,
  width,
  height,
  categoryTarget
) {
  
  if (!settings.dfp_publisher_id) {
    return;
  }
 
  if (ads[divId]) {
    return ads[divId];
  }

  let ad, config, publisherId;

  if (isMobile) {
    publisherId = settings.dfp_publisher_id_mobile || settings.dfp_publisher_id;
    config = MOBILE_SETTINGS[placement];
  } else {
    publisherId = settings.dfp_publisher_id;
    config = DESKTOP_SETTINGS[placement];
  }

  ad = window.googletag.defineSlot(
    "/" + publisherId + "/" + settings[config.code],
    [width, height],
    divId
  );

  custom_targeting(
    keyParse(settings[config.targeting_keys]),
    keyParse(settings[config.targeting_values]),
    ad
  );

  if (categoryTarget) {
    ad.setTargeting("discourse-category", categoryTarget);
  }

  ad.addService(window.googletag.pubads());

  ads[divId] = { ad, width, height };
  return ads[divId];
} */

function defineSlot(
  placement,
  settings,
  isMobile
) {

  let ad, config;

  if (isMobile) {
    config = MOBILE_SETTINGS[placement];
  } else {
    config = DESKTOP_SETTINGS[placement];
  }
  return "/" + settings[config.code];
}

/* Comment yg cdfsn */
/* function destroySlot(divId) {
  if (ads[divId] && window.googletag) {
    window.googletag.destroySlots([ads[divId].ad]);
    delete ads[divId];
  }
} */

function destroySlot( divId ) {
  var didna = window.didna || {};
  didna.cmd = didna.cmd || [];
  didna.cmd.push(function () {
      didna.removeAdUnits(divId);
  });
}

function loadDiDNA() {
  /**
   * Refer to this article for help:
   * https://support.google.com/admanager/answer/4578089?hl=en
   */

  if (_didnaLoaded) {
    return RSVP.resolve();
  }

  if (_didnaPromise) {
    return _didnaPromise;
  }

  // The boilerplate code
  let dfpSrc =
    ("https:" === document.location.protocol ? "https:" : "http:") +
    "//storage.googleapis.com/didna_hb/spg/sportspublishersgroupmixedmartialarts/didna_config.js";
   _didnaPromise  = loadScript(dfpSrc, { scriptTag: true }).then(function () {
    _didnaLoaded = true;

     /* Comment yg cdfsn */
 /*    if (window.googletag === undefined) {
      // eslint-disable-next-line no-console
      console.log("googletag is undefined!");
    }

    window.googletag.cmd.push(function () {
      // Infinite scroll requires SRA:
      window.googletag.pubads().enableSingleRequest();

      // we always use refresh() to fetch the ads:
      window.googletag.pubads().disableInitialLoad();

      window.googletag.enableServices();
    }); */
    
  });
    /* Comment yg cdfsn */
 /*  window.googletag = window.googletag || { cmd: [] }; */

  return _didnaPromise;
}

export default AdComponent.extend({
  classNameBindings: ["adUnitClass"],
  classNames: ["google-dfp-ad"],
  refreshOnChange: null,
  lastAdRefresh: null,
  width: alias("size.width"),
  height: alias("size.height"),

  @discourseComputed
  size() {
    return getWidthAndHeight(
      this.get("placement"),
      this.siteSettings,
      this.site.mobileView
    );
  },

  @discourseComputed(
    "siteSettings.dfp_publisher_id",
    "siteSettings.dfp_publisher_id_mobile",
    "site.mobileView"
  )
  publisherId(globalId, mobileId, isMobile) {
    if (isMobile) {
      return mobileId || globalId;
    } else {
      return globalId;
    }
  },
  
  @discourseComputed("placement", "postNumber")
  divId(placement, postNumber) {

  /* Comment yg cdfsn */
 /*  if (postNumber) {
      return `div-gpt-ad-${slotNum}-${placement}-${postNumber}`;
    } else {
      return `div-gpt-ad-${slotNum}-${placement}`;
    } 
 */
    //#yg- id for side ads
    /* if(postNumber == 0){
      return `skyscraper_1`;
    } */
    
    let slotNum = getNextSlotNum();   
    
    let id_for_ad_after_nth_post = this.siteSettings.dfd_topic_after_nth_post_id;
    
    let finval = id_for_ad_after_nth_post + slotNum; 
    
    if( placement == "topic-above-post-stream" || placement == "topic-list-top" ){
        return this.siteSettings.dfd_topic_above_post_stream_id;
    }

     // return `didna_slot_${slotNum}`;
     //return `inline_${slotNum}`;
     return finval;   
  },


  @discourseComputed("placement", "showAd")
  adUnitClass(placement, showAd) {
    return showAd ? `dfp-ad-${placement}` : "";
  },

  @discourseComputed("width", "height")
  adWrapperStyle(w, h) {
    if (w !== "fluid") {
      return htmlSafe(`width: ${w}px; height: ${h}px;`);
    }
  },

  @discourseComputed("width")
  adTitleStyleMobile(w) {
    if (w !== "fluid") {
      return htmlSafe(`width: ${w}px;`);
    }
  },

  @discourseComputed(
    "publisherId",
    "showToTrustLevel",
    "showToGroups",
    "showAfterPost",
    "showOnCurrentPage",
    "size"
  )
  showAd(
    publisherId,
    showToTrustLevel,
    showToGroups,
    showAfterPost,
    showOnCurrentPage,
    size
  ) {
    return (
      publisherId &&
      showToTrustLevel &&
      showToGroups &&
      showAfterPost &&
      showOnCurrentPage &&
      size
    );
  },

  @discourseComputed("currentUser.trust_level")
  showToTrustLevel(trustLevel) {
    return !(
      trustLevel && trustLevel > this.siteSettings.dfp_through_trust_level
    );
  },

  @discourseComputed("postNumber")
  showAfterPost(postNumber) {
    if (!postNumber) {
      return true;
    }

    return this.isNthPost(parseInt(this.siteSettings.dfp_nth_post_code, 10));
  },
   /* Comment yg cdfsn 2 */
/* 
  // 3 second delay between calls to refresh ads in a component.
  // Ember often calls updated() more than once, and *sometimes*
  // updated() is called after _initGoogleDFP().
  shouldRefreshAd() {
    const lastAdRefresh = this.get("lastAdRefresh");
    if (!lastAdRefresh) {
      return true;
    }
    return new Date() - lastAdRefresh > 3000;
  },

  @on("didUpdate")
  updated() {
    if (this.get("listLoading") || !this.shouldRefreshAd()) {
      return;
    }

    let slot = ads[this.get("divId")];
    if (!(slot && slot.ad)) {
      return;
    }

    let ad = slot.ad,
      categorySlug = this.get("currentCategorySlug");

    if (this.get("loadedGoogletag")) {
      this.set("lastAdRefresh", new Date());
      window.googletag.cmd.push(() => {
        ad.setTargeting("discourse-category", categorySlug || "0");
        window.googletag.pubads().refresh([ad]);
      });
    }
  },
 */
  @on("didInsertElement")
  _initGoogleDFP() {
    if (isTesting()) {
      return; // Don't load external JS during tests
    }

    if (!this.get("showAd")) {
      return;
    }
   /* Comment yg cdfsn */
 /*    loadGoogle().then(() => {
      this.set("loadedGoogletag", true);
      this.set("lastAdRefresh", new Date()); */

  /*     window.googletag.cmd.  (() => {
        let slot = defineSlot(
          this.get("divId"),
          this.get("placement"),
          this.siteSettings,
          this.site.mobileView,
          this.get("width"),
          this.get("height"),
          this.get("currentCategorySlug") || "0"
        );
        if (slot && slot.ad) {
          // Display has to be called before refresh
          // and after the slot div is in the page.
          window.googletag.display(this.get("divId"));
          window.googletag.pubads().refresh([slot.ad]);
        }
      }); */

      var didna = window.didna || {};
      didna.cmd = didna.cmd || [];
      var didna_counter = window.didna_counter || 0;
  
      didna.cmd.push(function () {
        didna.createAdUnits({
            id: id,
            adUnitPath: adUnitPath,
            size: [728, 90],
            sizeMap: [
                [
                    [728, 0],
                    [[728, 90],[468, 60],],
                ],
                [
                    [468, 0],[468, 60],
                ],
                [
                    [320, 0],
                    [[320, 50],[320, 100],],
                ],
            ],
        });
        didna_counter++;
    });

      loadDiDNA().then(() => {

    });
  },

  willRender() {
    this._super(...arguments);

    if (!this.get("showAd")) {
      return;
    }
  },

 /*  @on("willDestroyElement")
  cleanup() {
    destroySlot(this.get("divId"));
  }, */

  @on( "willDestroyElement" )
    cleanup() {
      destroySlot( this.get( "divId" ) );
    },
});
