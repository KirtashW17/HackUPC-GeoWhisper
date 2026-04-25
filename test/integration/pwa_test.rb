require "test_helper"

# Exercises the PWA surface: dynamic manifest, service worker, and the bits
# of the layout that make the app installable (manifest link + SW registration).
#
# We do not use a real browser — these are HTTP-level integration tests that
# verify the responses and the rendered HTML. Manual smoke-testing in a browser
# (DevTools → Application → Manifest / Service Workers) is still expected.
class PwaTest < ActionDispatch::IntegrationTest
  test "manifest is served as JSON with the expected fields" do
    get pwa_manifest_path(format: :json)

    assert_response :success
    assert_match %r{application/(manifest\+)?json}, response.media_type

    body = JSON.parse(response.body)
    assert_equal "GeoWhisper", body["name"]
    assert_equal "/", body["start_url"]
    assert_equal "standalone", body["display"]

    sizes = body.fetch("icons").map { |i| i["sizes"] }
    assert_includes sizes, "192x192"
    assert_includes sizes, "512x512"
  end

  test "service worker is served as JavaScript" do
    get pwa_service_worker_path(format: :js)

    assert_response :success
    assert_match %r{(javascript|ecmascript)}, response.media_type
  end

  test "layout links the manifest and registers the service worker" do
    get root_path

    assert_response :success
    assert_select "link[rel=manifest][href=?]", pwa_manifest_path(format: :json)
    assert_select 'meta[name="theme-color"]'
    # SW registration script is rendered (we don't assert the exact JS body,
    # just that registration is attempted against the named route).
    assert_match(/serviceWorker.*register/m, response.body)
    assert_includes response.body, pwa_service_worker_path(format: :js)
  end
end
