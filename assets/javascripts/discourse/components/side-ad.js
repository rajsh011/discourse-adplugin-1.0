import AdComponent from "discourse/plugins/discourse-adplugin/discourse/components/ad-component";
import discourseComputed, { on } from "discourse-common/utils/decorators";
import loadScript from "discourse/lib/load-script";


export default AdComponent.extend({

  @discourseComputed()
  hideClass(){
    if(this.router.currentURL.indexOf("/t/") > -1) {
        return 'hidden';
    }else{
      return 'show';
    }
  }, 
  @discourseComputed()
  divId(){
    return "skyscraper_1";
    //return "halfpage_1";
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
  @discourseComputed("currentUser.trust_level")
  showToTrustLevel(trustLevel) {
    return !(
      trustLevel && trustLevel > this.siteSettings.dfp_through_trust_level
    );
  },
  @discourseComputed(
    "publisherId", 
    "showToTrustLevel", 
    "showToGroups",
    "showOnCurrentPage",
  )
  showAd(
    publisherId,
    showToTrustLevel,
    showToGroups,
    showOnCurrentPage
    ) {
      if(!this.siteSettings.dfp_show_side_ad){
        return false;
      }
        if (window.location.href.indexOf("admin") > -1) {
            return false;
            }
    return (
      publisherId &&
      showToTrustLevel &&
      showToGroups &&
      showOnCurrentPage
    );
  }

addExcoPlayer() {
    const currentUser = this.get("currentUser");

    if (currentUser && currentUser.username) {
      let valueExists = true;

      for (const obj of currentUser.groups) {
        if (
          obj.name === "admins" ||
          obj.name === "Pro-Members" ||
          obj.name === "Business-Member" ||
          obj.name === "Pro-Fighters" ||
          obj.name === "Black-Belts" ||
          obj.name === "Mod-Team" ||
          obj.name === "OG-Mods" ||
          obj.name === "Top-Men"
        ) {
          valueExists = false;
          break; 
        }
      }

      if (valueExists) {
        setTimeout(() => {
          Ember.$(".video_section").html('');
          Ember.$('<div class="video_section"><div id="ace0fe48-0bdb-4202-b78c-dafca2c16291"></div></div>').insertAfter(".side-ad.discourse-adplugin");
        }, 1000);
      }
    }
  },

  
  didInsertElement() {
    this._super(...arguments);

   
    Ember.$.getScript("https://player.ex.co/player/ace0fe48-0bdb-4202-b78c-dafca2c16291")
      .done(() => {
        
        this.addExcoPlayer();
      })
      .fail((jqxhr, settings, exception) => {
       
        console.error("Failed to load Ex.co player script:", exception);
      });
  },

  
})