import { LegalLayout, LegalSection } from './LegalLayout';

const EFFECTIVE_DATE = '2026-05-07';

export function TermsContent() {
  return (
    <LegalLayout title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection id="purpose" title="제1조 (목적)">
        <p>
          본 약관은 Catch Stock(이하 &quot;회사&quot;)이 제공하는 종목 발굴 서비스(이하
          &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을
          규정함을 목적으로 합니다.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="제2조 (정의)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            &quot;이용자&quot;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및
            비회원을 말합니다.
          </li>
          <li>
            &quot;회원&quot;이란 Google 계정을 통해 본 서비스에 가입하여 지속적으로 서비스를
            이용할 수 있는 자를 말합니다.
          </li>
          <li>
            &quot;비회원&quot;이란 회원에 가입하지 않고 회사가 제공하는 일부 공개 정보를
            이용하는 자를 말합니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="effect" title="제3조 (약관의 효력 및 변경)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
          <li>
            회사는 합리적인 사유가 있을 경우 본 약관을 변경할 수 있으며, 변경된 약관은 적용일자
            7일 전부터 서비스 내에 공지합니다.
          </li>
          <li>
            이용자가 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 통해 이용계약을 해지할 수
            있습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="contract" title="제4조 (이용계약의 성립)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            이용계약은 이용자가 본 약관에 동의하고 Google 계정으로 로그인을 완료하는 시점에
            성립합니다.
          </li>
          <li>
            만 14세 미만의 아동은 본 서비스를 이용할 수 없습니다. 회사는 가입 절차에서 이를
            확인할 수 있습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="duties" title="제5조 (회원의 의무)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>회원은 관계 법령, 본 약관, 회사가 공지하는 사항을 준수하여야 합니다.</li>
          <li>
            회원은 자신의 계정 정보를 제3자에게 양도, 대여, 공유할 수 없으며 이로 인해 발생한
            손해에 대한 책임은 회원 본인에게 있습니다.
          </li>
          <li>
            회원은 서비스에서 제공하는 정보를 투자 자문이나 권유로 받아들여서는 안 되며, 모든
            투자 판단과 그 결과에 대한 책임은 회원 본인에게 있습니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="provision" title="제6조 (서비스의 제공 및 변경)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            회사는 다음의 서비스를 제공합니다.
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>RSI 등 기술적 지표를 활용한 종목 발굴 결과의 표시</li>
              <li>회원 계정 관리 및 관련 부가 서비스</li>
            </ul>
          </li>
          <li>
            회사는 운영상, 기술상 필요에 따라 제공 중인 서비스의 일부 또는 전부를 변경하거나
            중단할 수 있으며, 이 경우 사전에 공지합니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="restriction" title="제7조 (서비스 이용 제한)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            회사는 회원이 다음 각 호에 해당할 경우 사전 통지 없이 서비스 이용을 제한하거나
            계약을 해지할 수 있습니다.
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>타인의 정보를 도용하여 가입한 경우</li>
              <li>서비스의 안정적 운영을 방해하는 행위를 한 경우</li>
              <li>관계 법령을 위반한 경우</li>
            </ul>
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="liability" title="제8조 (책임 제한)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            서비스에 표시되는 종목 정보는 외부 데이터 제공자가 산정한 시세를 기반으로 하며,
            회사는 그 정확성·완전성·적시성을 보증하지 않습니다.
          </li>
          <li>
            회사는 천재지변, 정전, 회선 장애, 외부 데이터 제공자의 장애 등 불가항력 사유로 인한
            서비스 중단에 대해 책임을 지지 않습니다.
          </li>
          <li>
            서비스에서 제공되는 정보는 어떠한 경우에도 투자 자문, 권유, 추천이 아닙니다.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="dispute" title="제9조 (분쟁의 해결)">
        <p>
          본 약관과 관련된 분쟁은 대한민국 법령을 준거법으로 하며, 회사 본사 소재지를 관할하는
          법원을 제1심 관할 법원으로 합니다.
        </p>
      </LegalSection>

      <LegalSection id="addendum" title="부칙">
        <p>본 약관은 {EFFECTIVE_DATE}부터 시행합니다.</p>
      </LegalSection>
    </LegalLayout>
  );
}
