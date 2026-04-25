require "test_helper"

# Verifies the static HTML contract of the +/map+ screen. The clustering
# logic itself runs entirely in the browser (Stimulus +
# +map_controller.js+), so we cover it indirectly by asserting that the
# data-targets the JS expects, and the i18n strings it consumes, are
# present in the rendered markup.
class MapControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:alice))
  end

  test "renders the cluster sheet, overlay and close pill targets" do
    get map_path
    assert_response :success

    assert_select "[data-map-target='overlay']"
    assert_select "[data-map-target='sheet']"
    assert_select "[data-map-target='sheetEyebrow']"
    assert_select "[data-map-target='sheetList']"
    assert_select "[data-map-target='closePill']"
  end

  test "embeds the cluster i18n strings the controller consumes" do
    get map_path
    assert_response :success

    body = response.body
    assert_includes body, I18n.t("map.cluster.eyebrow.one")
    assert_includes body, I18n.t("map.cluster.here_eyebrow")
    assert_includes body, I18n.t("map.cluster.close")
  end

  test "redirects non-onboarded users to /welcome" do
    sign_in_as(users(:bob))
    get map_path
    assert_redirected_to welcome_path
  end
end
