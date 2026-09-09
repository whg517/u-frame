import { Link, isRouteErrorResponse, useRouteError } from "react-router"

import { Button } from "@/components/ui/button"
import { PageBody, PageHeader } from "@/shared/components/page"
import { t } from "@/shared/i18n/i18n"

export function RouteLoading() {
  return <div className="flex min-h-0 flex-1 flex-col"><PageHeader title="UFrame" /><PageBody><p role="status">{t("正在加载…")}</p></PageBody></div>
}

export function RouteErrorPage() {
  const error = useRouteError()
  return <RouteFailure notFound={isRouteErrorResponse(error) && error.status === 404} />
}

export function NotFoundPage() {
  return <RouteFailure notFound />
}

function RouteFailure({ notFound = false }: { notFound?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title={notFound ? t("页面不存在") : t("页面暂时无法打开")} />
      <PageBody>
        <p role="alert" className="mb-4 text-sm text-muted-foreground">
          {notFound ? t("请从导航选择要查看的内容。") : t("请重新打开页面，或返回机柜一览继续操作。")}
        </p>
        <div className="flex gap-2">
          <Button nativeButton={false} render={<Link to="/" />}>{t("返回机柜一览")}</Button>
          {!notFound && <Button variant="outline" onClick={() => window.location.reload()}>{t("重新打开")}</Button>}
        </div>
      </PageBody>
    </div>
  )
}
